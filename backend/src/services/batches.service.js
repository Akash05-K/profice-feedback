import prisma from "../config/db.js";

export const getBatchesList = async () => {
  const batches = await prisma.batch.findMany({
    include: {
      course: true,
      trainer: true,
    },
    orderBy: { batchCode: "asc" },
  });

  const completionMap = { "MERN-B12": 91, "DS-B07": 84, "UIUX-B05": 76, "CLOUD-B09": 89, "PY-B14": 94, "MERN-B13": 68 };
  const participationMap = { "MERN-B12": 88, "DS-B07": 79, "UIUX-B05": 71, "CLOUD-B09": 85, "PY-B14": 90, "MERN-B13": 64 };
  const scoreMap = { "MERN-B12": 92, "DS-B07": 83, "UIUX-B05": 74, "CLOUD-B09": 88, "PY-B14": 93, "MERN-B13": 66 };

  return batches.map((b) => ({
    id: String(b.id),
    name: b.batchCode,
    course: b.course.title,
    trainer: b.trainer.name,
    totalStudents: b.totalStudents,
    completionRate: completionMap[b.batchCode] || 85,
    participationRate: participationMap[b.batchCode] || 80,
    overallScore: scoreMap[b.batchCode] || 85,
  }));
};

export const getBatchStats = async () => {
  const batches = await getBatchesList();
  const totalStudents = batches.reduce((sum, b) => sum + b.totalStudents, 0);
  const avgCompletion = Math.round(batches.reduce((sum, b) => sum + b.completionRate, 0) / Math.max(1, batches.length));
  const avgParticipation = Math.round(batches.reduce((sum, b) => sum + b.participationRate, 0) / Math.max(1, batches.length));

  return {
    totalBatches: batches.length,
    totalStudents,
    avgCompletion,
    avgParticipation,
  };
};
