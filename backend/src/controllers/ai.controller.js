import prisma from "../config/db.js";
import * as aiService from "../services/ai.service.js";
import { resolveTrainerScope } from "../services/auth.service.js";

/**
 * GET /api/v1/ai/dashboard-summary
 * Executive AI summary of the whole database for the Dashboard AI Summary card.
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const [total, avgAgg, pos, neu, neg, sample] = await Promise.all([
      prisma.feedbackRecord.count({ where: { status: "active" } }),
      prisma.feedbackRecord.aggregate({ where: { status: "active" }, _avg: { rating: true } }),
      prisma.feedbackRecord.count({ where: { status: "active", sentiment: "positive" } }),
      prisma.feedbackRecord.count({ where: { status: "active", sentiment: "neutral" } }),
      prisma.feedbackRecord.count({ where: { status: "active", sentiment: "negative" } }),
      prisma.feedbackRecord.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { sentiment: true, rating: true, feedbackText: true },
      }),
    ]);

    const avgRating = Number((avgAgg._avg.rating || 0).toFixed(2));
    const denom = Math.max(1, total);
    const stats = { totalFeedback: total, averageRating: avgRating };
    const sentiment = {
      positivePct: Math.round((pos / denom) * 100),
      neutralPct: Math.round((neu / denom) * 100),
      negativePct: Math.round((neg / denom) * 100),
      positive: pos,
      neutral: neu,
      negative: neg,
    };

    // Deterministic fallback used when AI is disabled / fails.
    const fallback = {
      text:
        total === 0
          ? "No feedback has been collected yet. Upload a feedback file to generate AI insights."
          : `Across ${total} feedback records the average rating is ${avgRating}/5 with ${sentiment.positivePct}% positive, ${sentiment.neutralPct}% neutral and ${sentiment.negativePct}% negative sentiment. Review the improvement areas below to prioritise coaching.`,
      meta: { model: "fallback" },
    };

    const data = await aiService.generateDashboardSummary(
      { stats, sentiment, sampleFeedback: sample },
      fallback
    );

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/ai/recommendations?trainerId=
 * AI Recommendation Engine: summary + suggestions + risks (Gemini) plus
 * real performance predictions (from monthly ratings) and real action-plan count.
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const { trainerId } = req.query;
    const where = { status: "active" };
    let scopeLabel = "All Trainers";

    if (trainerId && trainerId !== "overall") {
      const idNum = parseInt(trainerId, 10);
      const trainer = await prisma.trainer.findFirst({
        where: { OR: [{ id: isNaN(idNum) ? -1 : idNum }, { name: trainerId }] },
        select: { id: true, name: true },
      });
      if (trainer) {
        where.trainerId = trainer.id;
        scopeLabel = trainer.name;
      }
    }

    const [records, pos, neu, neg, openActions] = await Promise.all([
      prisma.feedbackRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { id: true, rating: true, sentiment: true, feedbackText: true, createdAt: true },
      }),
      prisma.feedbackRecord.count({ where: { ...where, sentiment: "positive" } }),
      prisma.feedbackRecord.count({ where: { ...where, sentiment: "neutral" } }),
      prisma.feedbackRecord.count({ where: { ...where, sentiment: "negative" } }),
      prisma.actionItem.count({ where: { status: { in: ["open", "in_progress"] } } }),
    ]);

    const total = records.length;
    const denom = Math.max(1, pos + neu + neg);
    const sentiment = {
      positivePct: Math.round((pos / denom) * 100),
      neutralPct: Math.round((neu / denom) * 100),
      negativePct: Math.round((neg / denom) * 100),
    };

    // Real monthly performance: avg rating -> % (rating*20), with a light upward projection.
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth = {};
    records.forEach((r) => {
      const key = `${monthNames[new Date(r.createdAt).getMonth()]} ${new Date(r.createdAt).getFullYear()}`;
      if (!byMonth[key]) byMonth[key] = { sum: 0, n: 0 };
      byMonth[key].sum += r.rating;
      byMonth[key].n += 1;
    });
    const predictions = Object.entries(byMonth)
      .slice(-7)
      .map(([month, v]) => {
        const actualValue = Math.round((v.sum / v.n) * 20);
        return { month, actualValue, predictedValue: Math.min(100, actualValue + 6) };
      });
    const predictedPerformance = predictions.length
      ? `${predictions[predictions.length - 1].predictedValue}%`
      : "—";

    // Keyword-based fallback so the page works even without the LLM.
    const negWords = {};
    records.forEach((r) => {
      if (r.sentiment !== "positive") {
        (String(r.feedbackText || "").toLowerCase().match(/\b[a-z]{4,}\b/g) || []).forEach((w) => {
          if (!["that", "this", "with", "there", "have", "were", "they", "sessions", "session"].includes(w)) {
            negWords[w] = (negWords[w] || 0) + 1;
          }
        });
      }
    });
    const topNeg = Object.entries(negWords).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const fallback = {
      summary:
        total === 0
          ? "No feedback available for this scope yet."
          : `${sentiment.positivePct}% positive sentiment across ${total} recent records. Prioritise the improvement areas below to raise satisfaction.`,
      suggestions: topNeg.map(([w], i) => ({
        id: `SUG-${i + 1}`,
        title: `Address recurring feedback about "${w}"`,
        category: i === 0 ? "High" : i < 3 ? "Medium" : "Low",
        impactScore: String(9 - i),
      })),
      risks:
        sentiment.negativePct >= 30
          ? [{ id: "RISK-1", title: `High negative sentiment (${sentiment.negativePct}%)`, riskLevel: "High Risk", description: "A significant share of recent feedback is negative.", targetGroup: scopeLabel }]
          : [],
    };

    const ai = await aiService.generateRecommendations({ scopeLabel, records, sentiment }, fallback);

    res.status(200).json({
      success: true,
      data: {
        scopeLabel,
        summary: ai.summary,
        suggestions: ai.suggestions,
        risks: ai.risks,
        predictions,
        stats: {
          suggestionsCount: ai.suggestions.length,
          risksCount: ai.risks.length,
          predictedPerformance,
          activePlansCount: openActions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Build a compact, grounded data context for the free-form chat.
 * RBAC-scoped: a trainer only ever gets their own data.
 */
const buildChatContext = async (scopeTrainerId) => {
  const where = { status: "active" };
  if (scopeTrainerId) where.trainerId = scopeTrainerId;

  const [total, avgAgg, pos, neu, neg, records] = await Promise.all([
    prisma.feedbackRecord.count({ where }),
    prisma.feedbackRecord.aggregate({ where, _avg: { rating: true } }),
    prisma.feedbackRecord.count({ where: { ...where, sentiment: "positive" } }),
    prisma.feedbackRecord.count({ where: { ...where, sentiment: "neutral" } }),
    prisma.feedbackRecord.count({ where: { ...where, sentiment: "negative" } }),
    prisma.feedbackRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        rating: true,
        sentiment: true,
        feedbackText: true,
        createdAt: true,
        trainer: { select: { name: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  const avgRating = Number((avgAgg._avg.rating || 0).toFixed(2));

  // Whitelisted aggregates (safe, precomputed) so analytical questions are answerable
  // without executing any LLM-authored SQL.
  const groupByTrainer = scopeTrainerId
    ? []
    : await prisma.feedbackRecord.groupBy({
        by: ["trainerId"],
        where,
        _avg: { rating: true },
        _count: { _all: true },
        orderBy: { _avg: { rating: "desc" } },
        take: 10,
      });

  const trainerNames = groupByTrainer.length
    ? await prisma.trainer.findMany({
        where: { id: { in: groupByTrainer.map((g) => g.trainerId) } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = Object.fromEntries(trainerNames.map((t) => [t.id, t.name]));

  const trainerRollup = groupByTrainer
    .map((g) => `  - ${nameById[g.trainerId] || `Trainer#${g.trainerId}`}: avg ${Number((g._avg.rating || 0).toFixed(2))}/5 over ${g._count._all} reviews`)
    .join("\n");

  const sampleLines = records
    .map(
      (r) =>
        `  - [${r.sentiment}|${r.rating}/5] ${r.trainer?.name || "?"} / ${r.course?.title || "?"} (${new Date(r.createdAt).toISOString().slice(0, 10)}): "${String(r.feedbackText || "").replace(/\s+/g, " ").slice(0, 160)}"`
    )
    .join("\n");

  const scopeNote = scopeTrainerId
    ? "SCOPE: This user is a Trainer and may ONLY see their own feedback. All numbers below are their own.\n"
    : "";

  return (
    `${scopeNote}` +
    `Overall: ${total} active feedback records, average rating ${avgRating}/5.\n` +
    `Sentiment: ${pos} positive, ${neu} neutral, ${neg} negative.\n` +
    (trainerRollup ? `Top trainers by average rating:\n${trainerRollup}\n` : "") +
    `Recent feedback (most recent ${records.length}):\n${sampleLines || "  (none)"}`
  );
};

/**
 * POST /api/v1/ai/chat
 * Free-form, RBAC-scoped Q&A grounded in the feedback data.
 * Body: { message: string, history?: [{user, assistant}] }
 */
export const postChat = async (req, res, next) => {
  try {
    const { message, history } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "A question is required." });
    }
    if (String(message).length > 2000) {
      return res.status(400).json({ success: false, message: "Question is too long (max 2000 characters)." });
    }
    // Bound the history that gets folded into the prompt (cost / abuse guard).
    const safeHistory = (Array.isArray(history) ? history : [])
      .slice(-5)
      .map((h) => ({
        user: String(h?.user ?? "").slice(0, 2000),
        assistant: String(h?.assistant ?? "").slice(0, 2000),
      }));
    if (!aiService.isAiEnabled()) {
      return res.status(503).json({
        success: false,
        message: "AI chat is not configured. Set GEMINI_API_KEY on the server.",
      });
    }

    const scopeTrainerId = await resolveTrainerScope(req.user);
    const context = await buildChatContext(scopeTrainerId);

    const answer = await aiService.chatComplete({
      message: String(message).trim(),
      history: safeHistory,
      context,
    });

    res.status(200).json({ success: true, data: { answer, scoped: Boolean(scopeTrainerId) } });
  } catch (err) {
    next(err);
  }
};
