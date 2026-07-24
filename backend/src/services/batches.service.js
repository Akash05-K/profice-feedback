import prisma from "../config/db.js";

export const getBatchesList = async () => {
  const activeRecords = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    select: { batchId: true },
  });

  const activeBatchIds = Array.from(new Set(activeRecords.map((r) => r.batchId).filter(Boolean)));

  if (activeBatchIds.length === 0) {
    return [];
  }

  const batches = await prisma.batch.findMany({
    where: { id: { in: activeBatchIds } },
    include: {
      course: true,
      trainer: true,
    },
    orderBy: { batchCode: "asc" },
  });

  return batches.map((b) => ({
    id: String(b.id),
    name: b.batchCode,
    course: b.course ? b.course.title : "N/A",
    trainer: b.trainer ? b.trainer.name : "N/A",
    totalStudents: b.totalStudents,
    completionRate: 85,
    participationRate: 80,
    overallScore: 85,
  }));
};

export const getBatchStats = async () => {
  const batches = await getBatchesList();
  if (batches.length === 0) {
    return {
      totalBatches: 0,
      totalStudents: 0,
      avgCompletion: 0,
      avgParticipation: 0,
    };
  }

  const totalStudents = batches.reduce((sum, b) => sum + b.totalStudents, 0);
  const avgCompletion = Math.round(batches.reduce((sum, b) => sum + b.completionRate, 0) / batches.length);
  const avgParticipation = Math.round(batches.reduce((sum, b) => sum + b.participationRate, 0) / batches.length);

  return {
    totalBatches: batches.length,
    totalStudents,
    avgCompletion,
    avgParticipation,
  };
};
