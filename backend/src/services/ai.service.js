import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

/**
 * AI core service.
 *
 * Ports the useful parts of the SQL-RAG Python agent (sql_chatbot.py) into Node:
 *  - concise, no-fluff prompt style
 *  - JSON fence stripping / parsing (parse_json_response)
 *  - 429 / ResourceExhausted retry wrapper (safe_llm_complete)
 *
 * Improvements over the original:
 *  - grounded in the real MySQL data (retrieval happens in the calling services)
 *  - structured, validated JSON for fixed widgets
 *  - in-memory TTL cache to cut latency, cost and rate-limit crashes
 *  - graceful fallback: if the key is missing or the API fails, callers get their
 *    existing keyword-stub output so the UI never breaks.
 */

const TONE_GUIDE =
  "You are a concise analytics assistant for a training-feedback platform. " +
  "Write brief, direct, factual statements grounded ONLY in the provided data. " +
  "Do not invent numbers, names or facts. Avoid flowery praise, moral support, " +
  "filler and long-winded encouragement.";

let _model = null;

export const isAiEnabled = () => Boolean(env.GEMINI_API_KEY);

const getModel = () => {
  if (!isAiEnabled()) return null;
  if (_model) return _model;
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  _model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });
  return _model;
};

const isRateLimit = (err) => {
  const msg = String(err?.message || err || "");
  return msg.includes("429") || msg.includes("ResourceExhausted") || msg.includes("rate");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call Gemini with retry on rate-limit. Returns the raw text response.
 * Port of safe_llm_complete().
 */
const safeComplete = async (prompt, { retries = 3, delayMs = 4000, json = false, temperature } = {}) => {
  const model = getModel();
  if (!model) throw new Error("AI_DISABLED");

  const generationConfig = {};
  if (json) generationConfig.responseMimeType = "application/json";
  if (typeof temperature === "number") generationConfig.temperature = temperature;
  const hasConfig = Object.keys(generationConfig).length > 0;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(hasConfig ? { generationConfig } : {}),
      });
      return result.response.text();
    } catch (err) {
      if (isRateLimit(err) && i < retries - 1) {
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error("AI_RETRIES_EXHAUSTED");
};

/** Strip ```json fences and parse. Port of parse_json_response(). */
const parseJson = (text) => {
  let t = String(text || "").trim();
  if (t.startsWith("```json")) t = t.slice(7);
  else if (t.startsWith("```")) t = t.slice(3);
  if (t.endsWith("```")) t = t.slice(0, -3);
  return JSON.parse(t.trim());
};

/** Coerce a value to an array of clean, non-empty strings, capped at `max`. */
const toStringList = (val, max = 6) => {
  if (!Array.isArray(val)) return [];
  return val
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
};

// --- Simple in-memory TTL cache ------------------------------------------------

const _cache = new Map();

const withCache = async (key, ttlMs, fn) => {
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && hit.expires > now) return hit.value;
  const value = await fn();
  _cache.set(key, { value, expires: now + ttlMs });
  return value;
};

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// --- Structured JSON completion with validation + fallback ---------------------

/**
 * Run a JSON generation with graceful fallback.
 * @param {object} opts
 * @param {string} opts.cacheKey
 * @param {string} opts.prompt
 * @param {(parsed:any)=>any} opts.shape - maps/validates parsed JSON to the caller's shape; throw to reject
 * @param {any} opts.fallback - returned when AI is disabled or anything fails
 */
const generateStructured = async ({ cacheKey, prompt, shape, fallback }) => {
  if (!isAiEnabled()) return fallback;
  try {
    return await withCache(cacheKey, CACHE_TTL, async () => {
      const raw = await safeComplete(prompt, { json: true });
      const parsed = parseJson(raw);
      const out = shape(parsed);
      if (out == null) throw new Error("EMPTY_SHAPE");
      return out;
    });
  } catch (err) {
    if (env.NODE_ENV === "development") {
      console.warn(`[ai.service] fallback for ${cacheKey}: ${err?.message || err}`);
    }
    return fallback;
  }
};

const hashData = (obj) => {
  // Cheap stable-ish hash so cache keys change when the underlying data changes.
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return String(h);
};

const feedbackLines = (records, max = 40) =>
  records
    .slice(0, max)
    .map((r) => `- [${r.sentiment}|${r.rating}/5] "${String(r.feedbackText || "").replace(/\s+/g, " ").slice(0, 200)}"`)
    .join("\n");

// --- Feature generators --------------------------------------------------------

/**
 * Executive summary of the whole database for the Dashboard AI Summary card.
 * @returns {{text:string, metrics:Array, meta:object}}
 */
export const generateDashboardSummary = async ({ stats, sentiment, sampleFeedback }, fallback) => {
  const prompt =
    `${TONE_GUIDE}\n\n` +
    `Aggregate stats (whole database): ${JSON.stringify(stats)}\n` +
    `Sentiment split: ${JSON.stringify(sentiment)}\n\n` +
    `Sample of recent feedback comments:\n${feedbackLines(sampleFeedback)}\n\n` +
    `Return ONLY JSON: {"text": "<4-5 sentence executive summary of overall training ` +
    `quality, strengths and the biggest risk area, grounded in the data>"}.`;

  const result = await generateStructured({
    cacheKey: `dash:${hashData({ stats, sentiment })}`,
    prompt,
    shape: (p) => {
      const text = String(p?.text || "").trim();
      if (!text) return null;
      return { text, meta: { model: env.GEMINI_MODEL } };
    },
    fallback: null,
  });
  return result || fallback;
};

/**
 * Per-upload-session (file) insights: a summary paragraph + recommended actions.
 * @returns {{summary:string, actions:string[]}}
 */
export const generateSessionInsights = async ({ filename, records, counts }, fallback) => {
  const prompt =
    `${TONE_GUIDE}\n\n` +
    `A feedback file "${filename}" was analyzed. Counts: ${JSON.stringify(counts)}.\n\n` +
    `Feedback comments:\n${feedbackLines(records)}\n\n` +
    `Return ONLY JSON: {"summary": "<3-4 sentence summary of what students said in this file>", ` +
    `"actions": ["<3-5 specific, actionable recommendations to address the issues raised>"]}.`;

  const result = await generateStructured({
    cacheKey: `sess:${hashData({ filename, counts, n: records.length })}`,
    prompt,
    shape: (p) => {
      const summary = String(p?.summary || "").trim();
      const actions = toStringList(p?.actions, 5);
      if (!summary && actions.length === 0) return null;
      return { summary, actions };
    },
    fallback: null,
  });
  return result || fallback;
};

/**
 * Per-trainer insights: strengths, weaknesses, recommendations.
 * @returns {{strengths:string[], weaknesses:string[], recommendations:string[]}}
 */
export const generateTrainerInsights = async ({ trainerLabel, records }, fallback) => {
  const prompt =
    `${TONE_GUIDE}\n\n` +
    `Analyze student feedback for trainer scope "${trainerLabel}".\n\n` +
    `Feedback comments:\n${feedbackLines(records)}\n\n` +
    `Return ONLY JSON: {"strengths": ["<2-4 concrete strengths students praised>"], ` +
    `"weaknesses": ["<2-3 concrete areas students flagged for improvement>"], ` +
    `"recommendations": ["<2-3 specific coaching actions for this trainer>"]}.`;

  const result = await generateStructured({
    cacheKey: `trainer:${hashData({ trainerLabel, n: records.length, r: records.map((x) => x.id) })}`,
    prompt,
    shape: (p) => {
      const strengths = toStringList(p?.strengths, 4);
      const weaknesses = toStringList(p?.weaknesses, 3);
      const recommendations = toStringList(p?.recommendations, 3);
      if (!strengths.length && !weaknesses.length && !recommendations.length) return null;
      return { strengths, weaknesses, recommendations };
    },
    fallback: null,
  });
  return result || fallback;
};

/**
 * Per-course AI improvement suggestions.
 * @returns {{improvementSuggestions:string[]}}
 */
export const generateCourseSuggestions = async ({ courseLabel, records }, fallback) => {
  const prompt =
    `${TONE_GUIDE}\n\n` +
    `Analyze student feedback for course "${courseLabel}".\n\n` +
    `Feedback comments:\n${feedbackLines(records)}\n\n` +
    `Return ONLY JSON: {"improvementSuggestions": ["<3-5 specific suggestions to improve this ` +
    `course's content, delivery and practical sessions, grounded in the feedback>"]}.`;

  const result = await generateStructured({
    cacheKey: `course:${hashData({ courseLabel, n: records.length, r: records.map((x) => x.id) })}`,
    prompt,
    shape: (p) => {
      const improvementSuggestions = toStringList(p?.improvementSuggestions, 5);
      if (!improvementSuggestions.length) return null;
      return { improvementSuggestions };
    },
    fallback: null,
  });
  return result || fallback;
};

/**
 * AI Recommendation Engine: improvement suggestions + risk detections + summary,
 * generated from real feedback. Numeric predictions/stats are computed by the caller.
 * @returns {{summary:string, suggestions:Array, risks:Array}}
 */
export const generateRecommendations = async ({ scopeLabel, records, sentiment }, fallback) => {
  const prompt =
    `${TONE_GUIDE}\n\n` +
    `Analyze student feedback for scope "${scopeLabel}". Sentiment split: ${JSON.stringify(sentiment)}.\n\n` +
    `Feedback comments:\n${feedbackLines(records, 50)}\n\n` +
    `Return ONLY JSON with this exact shape:\n` +
    `{"summary": "<3-4 sentence recommendation summary>", ` +
    `"suggestions": [{"title": "<actionable improvement>", "category": "High|Medium|Low", "impactScore": <number 1-10>}], ` +
    `"risks": [{"title": "<risk>", "riskLevel": "High Risk|Medium Risk|Low Risk", "description": "<one sentence>", "targetGroup": "<who>"}]}.\n` +
    `Provide 4-5 suggestions and 2-4 risks, grounded strictly in the feedback.`;

  const result = await generateStructured({
    cacheKey: `recs:${hashData({ scopeLabel, n: records.length, r: records.map((x) => x.id) })}`,
    prompt,
    shape: (p) => {
      const summary = String(p?.summary || "").trim();
      const suggestions = Array.isArray(p?.suggestions)
        ? p.suggestions
            .filter((s) => s && s.title)
            .slice(0, 6)
            .map((s, i) => ({
              id: `SUG-${i + 1}`,
              title: String(s.title).trim(),
              category: ["High", "Medium", "Low"].includes(s.category) ? s.category : "Medium",
              impactScore: String(Number(s.impactScore) || 7).slice(0, 4),
            }))
        : [];
      const risks = Array.isArray(p?.risks)
        ? p.risks
            .filter((r) => r && r.title)
            .slice(0, 4)
            .map((r, i) => ({
              id: `RISK-${i + 1}`,
              title: String(r.title).trim(),
              riskLevel: ["High Risk", "Medium Risk", "Low Risk"].includes(r.riskLevel) ? r.riskLevel : "Medium Risk",
              description: String(r.description || "").trim(),
              targetGroup: String(r.targetGroup || scopeLabel).trim(),
            }))
        : [];
      if (!summary && suggestions.length === 0 && risks.length === 0) return null;
      return { summary, suggestions, risks };
    },
    fallback: null,
  });
  return result || fallback;
};

/**
 * Classify a batch of feedback comments by the MEANING of the text (not the star
 * rating), and extract topic keywords. Sends the batch to Gemini in chunks (one call
 * per chunk, not per row).
 *
 * @param {Array<{index:number, text:string, rating:number}>} items
 * @returns {Promise<Map<number, {sentiment:string, keywords:string[]}>>}
 *   A map of row-index -> classification. Rows that couldn't be classified (AI off,
 *   API failure, empty text) are simply absent, so the caller falls back per-row.
 */
const CLASSIFY_CHUNK = 30;

export const classifyFeedbackBatch = async (items) => {
  const result = new Map();
  const usable = (items || []).filter((it) => it && String(it.text || "").trim());
  if (!isAiEnabled() || usable.length === 0) return result;

  const chunks = [];
  for (let i = 0; i < usable.length; i += CLASSIFY_CHUNK) {
    chunks.push(usable.slice(i, i + CLASSIFY_CHUNK));
  }

  for (const chunk of chunks) {
    try {
      const listing = chunk
        .map((it) => `[${it.index}] (rating ${it.rating ?? "?"}/5) "${String(it.text).replace(/\s+/g, " ").slice(0, 300)}"`)
        .join("\n");

      const prompt =
        `${TONE_GUIDE}\n\n` +
        `Classify each student feedback comment by the MEANING of the text. Judge the ` +
        `actual message, not the star rating — a high rating with negative words is ` +
        `negative, and a low rating with positive words is positive. For each item give:\n` +
        `- "sentiment": exactly one of "positive", "neutral", "negative"\n` +
        `- "keywords": 2-4 short lowercase topic phrases (1-2 words each) describing what the comment is about\n\n` +
        `Comments (each prefixed with its index in brackets):\n${listing}\n\n` +
        `Return ONLY a JSON array, one object per item, preserving the index:\n` +
        `[{"i": <index number>, "sentiment": "positive|neutral|negative", "keywords": ["kw1","kw2"]}]`;

      // temperature 0 -> deterministic, reproducible sentiment/keyword labels.
      const raw = await safeComplete(prompt, { json: true, temperature: 0 });
      const parsed = parseJson(raw);

      if (Array.isArray(parsed)) {
        parsed.forEach((row) => {
          const i = Number(row?.i);
          const sentiment = ["positive", "neutral", "negative"].includes(row?.sentiment) ? row.sentiment : null;
          if (!Number.isInteger(i) || !sentiment) return;
          const keywords = Array.isArray(row?.keywords)
            ? row.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean).slice(0, 4)
            : [];
          result.set(i, { sentiment, keywords });
        });
      }
    } catch (err) {
      if (env.NODE_ENV === "development") {
        console.warn(`[ai.service] classifyFeedbackBatch chunk failed: ${err?.message || err}`);
      }
      // Leave this chunk's rows unclassified; the caller falls back per-row.
    }
  }

  return result;
};

/**
 * Free-form chat answer grounded in the provided context.
 * @returns {string} answer text (throws if AI disabled — caller handles)
 */
export const chatComplete = async ({ message, history = [], context }) => {
  if (!isAiEnabled()) throw new Error("AI_DISABLED");

  const historyStr = history
    .slice(-5)
    .map((h) => `User: ${h.user}\nAssistant: ${h.assistant}`)
    .join("\n");

  const prompt =
    `${TONE_GUIDE}\n\n` +
    `You answer questions using ONLY the data context below. If the answer is not in the ` +
    `context, say you don't have that data. Keep answers short and specific.\n\n` +
    `DATA CONTEXT:\n${context}\n\n` +
    `Conversation so far:\n${historyStr}\n\n` +
    `User: ${message}\nAssistant:`;

  const raw = await safeComplete(prompt);
  return String(raw || "").trim();
};

export default {
  isAiEnabled,
  generateDashboardSummary,
  generateSessionInsights,
  generateTrainerInsights,
  generateCourseSuggestions,
  generateRecommendations,
  classifyFeedbackBatch,
  chatComplete,
};
