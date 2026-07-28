import prisma from "../config/db.js";
import * as aiService from "./ai.service.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const buildRatingTrend = (records) => {
  const byMonth = new Map();
  records.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!byMonth.has(key)) byMonth.set(key, { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, sum: 0, n: 0 });
    const b = byMonth.get(key);
    b.sum += r.rating;
    b.n += 1;
  });
  return Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({ month: v.label, rating: Number((v.sum / v.n).toFixed(2)) }));
};

export const getTrainerFilterOptions = async (queryParams = {}, userScope = null) => {
  const { college, course } = queryParams;

  let where = { status: "active" };

  if (userScope?.isProgramManager) {
    where.OR = [
      { trainerId: { in: userScope.trainerIds } },
      { trainer: { program: userScope.program } },
    ];
  } else if (userScope?.isTrainer) {
    const scopeTrainerId = userScope.trainerId;
    where.trainerId = scopeTrainerId ? (Array.isArray(scopeTrainerId) ? { in: scopeTrainerId } : scopeTrainerId) : -1;
  }

  const records = await prisma.feedbackRecord.findMany({
    where,
    select: {
      college: { select: { name: true } },
      course: { select: { title: true } },
      trainer: { select: { id: true, name: true, program: true } },
    },
  });

  const collegesSet = new Set();
  const coursesSet = new Set();
  const trainersMap = new Map();

  if (userScope?.isProgramManager) {
    const dbTrainers = await prisma.trainer.findMany({
      where: { program: userScope.program },
      select: { id: true, name: true },
    });
    dbTrainers.forEach((t) => trainersMap.set(String(t.id), t.name));
  }

  records.forEach((r) => {
    if (r.college?.name) collegesSet.add(r.college.name);

    const matchCollege = !college || college === "All Colleges" || r.college?.name === college;
    if (r.course?.title && matchCollege) {
      coursesSet.add(r.course.title);
    }

    const matchCourse = !course || course === "All Courses" || r.course?.title === course;
    if (r.trainer?.id && r.trainer?.name && matchCollege && matchCourse) {
      trainersMap.set(String(r.trainer.id), r.trainer.name);
    }
  });

  const trainersList = Array.from(trainersMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    colleges: ["All Colleges", ...Array.from(collegesSet).sort()],
    courses: ["All Courses", ...Array.from(coursesSet).sort()],
    trainers: userScope?.isTrainer
      ? trainersList
      : [{ id: "overall", name: "Overall Classification" }, ...trainersList],
  };
};

export const getTrainersList = async (collegeName, courseTitle, userScope = null) => {
  let trainerWhere = {};
  if (userScope?.isProgramManager) {
    trainerWhere.program = userScope.program;
  } else if (userScope?.isTrainer) {
    trainerWhere.id = userScope.trainerId ? (Array.isArray(userScope.trainerId) ? { in: userScope.trainerId } : userScope.trainerId) : -1;
  }

  if (collegeName && collegeName !== "All Colleges") {
    trainerWhere.college = { name: collegeName };
  }

  const dbTrainers = await prisma.trainer.findMany({
    where: trainerWhere,
    include: { college: true },
  });

  const list = dbTrainers.map((t) => {
    let specialties = "All Subjects";
    if (t.subjectSpecialties) {
      try {
        const parsed = JSON.parse(t.subjectSpecialties);
        if (Array.isArray(parsed)) specialties = parsed.join(" & ");
      } catch {
        specialties = t.subjectSpecialties;
      }
    }
    return {
      id: String(t.id),
      name: t.name,
      subject: specialties,
      college: t.college ? t.college.name : "All Colleges",
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return [{ id: "overall", name: "Overall Classification", subject: "All Trainers & Subjects", college: "All Colleges" }, ...list];
};

export const getTrainerMetrics = async (trainerId, queryParams = {}, userScope = null) => {
  const { college, course } = queryParams;
  const where = { status: "active" };

  if (college && college !== "All Colleges") {
    where.college = { name: college };
  }
  if (course && course !== "All Courses") {
    where.course = { title: course };
  }

  if (userScope?.isProgramManager) {
    where.OR = [
      { trainerId: { in: userScope.trainerIds } },
      { trainer: { program: userScope.program } },
    ];
  }

  if (trainerId && trainerId !== "overall") {
    const idNum = parseInt(trainerId, 10);
    const trainer = await prisma.trainer.findFirst({
      where: {
        OR: [{ id: isNaN(idNum) ? -1 : idNum }, { name: trainerId }],
      },
    });

    if (trainer) {
      // Security check for Program Manager: ensure trainer belongs to PM's program
      if (userScope?.isProgramManager && trainer.program !== userScope.program && !userScope.trainerIds.includes(trainer.id)) {
        const error = new Error("Access denied. Trainer belongs to another Program Manager.");
        error.statusCode = 403;
        throw error;
      }

      const allMatchingTrainers = await prisma.trainer.findMany({
        where: { name: { equals: trainer.name } },
        select: { id: true },
      });
      where.trainerId = { in: allMatchingTrainers.map((t) => t.id) };
    }
  }

  const records = await prisma.feedbackRecord.findMany({
    where,
    select: { id: true, sentiment: true, aiKeywords: true, feedbackText: true, batchId: true, rating: true, createdAt: true },
  });

  const totalReviews = records.length;

  if (totalReviews === 0) {
    return {
      overallRating: 0,
      totalReviews: 0,
      satisfaction: 0,
      totalBatches: 0,
      positiveRate: 0,
      monthlyTrend: [],
      strengths: [],
      weaknesses: [],
      recommendations: [],
    };
  }

  const sumRating = records.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = sumRating / totalReviews;

  const satisfiedCount = records.filter((r) => r.rating >= 3).length;
  const satisfaction = Math.round((satisfiedCount / totalReviews) * 100);

  const batchIdsSet = new Set(records.map((r) => r.batchId).filter(Boolean));
  const totalBatches = batchIdsSet.size;
  const positiveRate = Math.round((records.filter((r) => r.sentiment === "positive").length / totalReviews) * 100);

  const posKeywords = {};
  const negKeywords = {};

  records.forEach((r) => {
    let kws = [];
    if (r.aiKeywords) {
      if (Array.isArray(r.aiKeywords)) {
        kws = r.aiKeywords;
      } else {
        try { kws = JSON.parse(r.aiKeywords); } catch { kws = []; }
      }
    }
    kws.forEach((kw) => {
      const clean = String(kw).toLowerCase().trim();
      if (!clean) return;
      if (r.sentiment === "positive") {
        posKeywords[clean] = (posKeywords[clean] || 0) + 1;
      } else if (r.sentiment === "negative") {
        negKeywords[clean] = (negKeywords[clean] || 0) + 1;
      }
    });
  });

  const topPos = Object.entries(posKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([kw]) => `Strong student feedback on ${kw}`);

  const topNeg = Object.entries(negKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw]) => `Improvement needed regarding ${kw}`);

  const fallbackInsights = {
    strengths: topPos.length > 0 ? topPos : ["Strong overall student feedback"],
    weaknesses: topNeg.length > 0 ? topNeg : ["No major negative feedback reported"],
    recommendations: ["Continue tracking student responses for upcoming batches"],
  };

  const trainerLabel = trainerId && trainerId !== "overall" ? String(trainerId) : "All trainers";
  const { strengths, weaknesses, recommendations } = await aiService.generateTrainerInsights(
    { trainerLabel, records },
    fallbackInsights
  );

  return {
    overallRating: Number(avgRating.toFixed(1)),
    totalReviews,
    satisfaction,
    totalBatches,
    positiveRate,
    monthlyTrend: buildRatingTrend(records),
    strengths,
    weaknesses,
    recommendations,
  };
};
