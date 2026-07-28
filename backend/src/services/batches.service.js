import prisma from "../config/db.js";
import { applyBatchScope, applyFeedbackScope } from "../utils/scope.js";

export const getBatchesList = async (userScope = null) => {
  const activeRecords = await prisma.feedbackRecord.findMany({
    where: applyFeedbackScope({ status: "active", batchId: { not: null } }, userScope),
    select: { batchId: true, rating: true, sentiment: true },
  });

  if (activeRecords.length === 0) {
    return [];
  }

  // Aggregate real feedback per batch. We only report metrics we can actually
  // derive from feedback (avg rating, satisfaction, positive sentiment) — not
  // enrollment/completion rates, which the source data doesn't contain.
  const byBatch = {};
  activeRecords.forEach((r) => {
    if (!byBatch[r.batchId]) byBatch[r.batchId] = { sum: 0, n: 0, satisfied: 0, positive: 0 };
    byBatch[r.batchId].sum += r.rating;
    byBatch[r.batchId].n += 1;
    if (r.rating >= 3) byBatch[r.batchId].satisfied += 1;
    if (r.sentiment === "positive") byBatch[r.batchId].positive += 1;
  });

  const activeBatchIds = Object.keys(byBatch).map(Number);

  // Scoped a second time on the batch itself: the aggregate above is already
  // restricted, but this guarantees no out-of-scope trainer name can be joined
  // in even if a record were mis-filed.
  const batches = await prisma.batch.findMany({
    where: applyBatchScope({ id: { in: activeBatchIds } }, userScope),
    include: { course: true, trainer: true },
    orderBy: { batchCode: "asc" },
  });

  return batches.map((b) => {
    const agg = byBatch[b.id];
    return {
      id: String(b.id),
      name: b.batchCode,
      course: b.course ? b.course.title : "N/A",
      trainer: b.trainer ? b.trainer.name : "N/A",
      responses: agg.n,
      avgRating: Number((agg.sum / agg.n).toFixed(2)),
      overallScore: Math.round((agg.sum / agg.n) * 20), // avg rating -> 0-100
      satisfactionRate: Math.round((agg.satisfied / agg.n) * 100), // % rated >= 3
      positiveRate: Math.round((agg.positive / agg.n) * 100), // % positive sentiment
    };
  });
};

export const getBatchStats = async (userScope = null) => {
  const batches = await getBatchesList(userScope);
  if (batches.length === 0) {
    return {
      totalBatches: 0,
      totalResponses: 0,
      avgSatisfaction: 0,
      avgPositive: 0,
    };
  }

  const totalResponses = batches.reduce((sum, b) => sum + b.responses, 0);
  const avgSatisfaction = Math.round(batches.reduce((sum, b) => sum + b.satisfactionRate, 0) / batches.length);
  const avgPositive = Math.round(batches.reduce((sum, b) => sum + b.positiveRate, 0) / batches.length);

  return {
    totalBatches: batches.length,
    totalResponses,
    avgSatisfaction,
    avgPositive,
  };
};
