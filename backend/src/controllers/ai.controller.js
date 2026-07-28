import prisma from "../config/db.js";
import * as aiService from "../services/ai.service.js";
import { resolveUserScope } from "../services/auth.service.js";

const applyAiScope = (where, userScope) => {
  if (!userScope || userScope.isUnrestricted) return where;

  if (userScope.isProgramManager) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { trainerId: { in: userScope.trainerIds } },
          { courseId: { in: userScope.courseIds } },
          { trainer: { program: userScope.program } },
          { course: { program: userScope.program } },
        ],
      },
    ];
  } else if (userScope.isTrainer) {
    const scopeTrainerId = userScope.trainerId;
    where.trainerId = scopeTrainerId ? (Array.isArray(scopeTrainerId) ? { in: scopeTrainerId } : scopeTrainerId) : -1;
  }
  return where;
};

/**
 * GET /api/v1/ai/dashboard-summary
 * Executive AI summary scoped to user's assigned data.
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const where = applyAiScope({ status: "active" }, userScope);

    const [total, avgAgg, pos, neu, neg, sample] = await Promise.all([
      prisma.feedbackRecord.count({ where }),
      prisma.feedbackRecord.aggregate({ where, _avg: { rating: true } }),
      prisma.feedbackRecord.count({ where: { ...where, sentiment: "positive" } }),
      prisma.feedbackRecord.count({ where: { ...where, sentiment: "neutral" } }),
      prisma.feedbackRecord.count({ where: { ...where, sentiment: "negative" } }),
      prisma.feedbackRecord.findMany({
        where,
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

    const fallback = {
      text:
        total === 0
          ? "No feedback has been collected yet for your assigned program. Upload feedback to generate AI insights."
          : `Across ${total} feedback records in ${userScope?.program ? userScope.program + " Program" : "your scope"}, the average rating is ${avgRating}/5 with ${sentiment.positivePct}% positive, ${sentiment.neutralPct}% neutral and ${sentiment.negativePct}% negative sentiment.`,
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
 * AI Recommendations scoped to user's assigned program/trainer.
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const { trainerId } = req.query;
    let where = applyAiScope({ status: "active" }, userScope);
    let scopeLabel = userScope?.program ? `${userScope.program} Program` : "All Trainers";

    if (trainerId && trainerId !== "overall") {
      const idNum = parseInt(trainerId, 10);
      const trainer = await prisma.trainer.findFirst({
        where: { OR: [{ id: isNaN(idNum) ? -1 : idNum }, { name: trainerId }] },
        select: { id: true, name: true, program: true },
      });
      if (trainer) {
        if (userScope?.isProgramManager && trainer.program !== userScope.program && !userScope.trainerIds.includes(trainer.id)) {
          return res.status(403).json({ success: false, message: "Access denied. Trainer belongs to another Program Manager." });
        }
        where.trainerId = trainer.id;
        scopeLabel = trainer.name;
      }
    }

    const actionWhere = userScope?.isProgramManager
      ? { status: { in: ["open", "in_progress"] }, assignedTo: { OR: [{ program: userScope.program }, { id: { in: userScope.trainerIds } }] } }
      : { status: { in: ["open", "in_progress"] } };

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
      prisma.actionItem.count({ where: actionWhere }),
    ]);

    const total = records.length;
    const denom = Math.max(1, pos + neu + neg);
    const sentiment = {
      positivePct: Math.round((pos / denom) * 100),
      neutralPct: Math.round((neu / denom) * 100),
      negativePct: Math.round((neg / denom) * 100),
    };

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

const buildChatContext = async (userScope) => {
  const where = applyAiScope({ status: "active" }, userScope);

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

  const groupByTrainer = await prisma.feedbackRecord.groupBy({
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

  const scopeNote = userScope?.program
    ? `SCOPE: Program Manager for ${userScope.program} Program. Strictly isolated to ${userScope.program} trainers and courses.\n`
    : userScope?.isTrainer
    ? "SCOPE: Trainer viewing own feedback.\n"
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

    const userScope = await resolveUserScope(req.user);
    const context = await buildChatContext(userScope);

    const answer = await aiService.chatComplete({
      message: String(message).trim(),
      history: safeHistory,
      context,
    });

    res.status(200).json({ success: true, data: { answer, scoped: !userScope.isUnrestricted } });
  } catch (err) {
    next(err);
  }
};
