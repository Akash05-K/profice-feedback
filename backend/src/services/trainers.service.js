import prisma from "../config/db.js";

export const getTrainerFilterOptions = async (queryParams = {}) => {
  const { college, course } = queryParams;

  const records = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    select: {
      college: { select: { name: true } },
      course: { select: { title: true } },
      trainer: { select: { id: true, name: true } },
    },
  });

  const collegesSet = new Set();
  const coursesSet = new Set();
  const trainersMap = new Map();

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
    trainers: [
      { id: "overall", name: "Overall Classification" },
      ...trainersList,
    ],
  };
};

export const getTrainersList = async (collegeName, courseTitle) => {
  const where = { status: "active" };

  if (collegeName && collegeName !== "All Colleges") {
    where.college = { name: collegeName };
  }
  if (courseTitle && courseTitle !== "All Courses") {
    where.course = { title: courseTitle };
  }

  const records = await prisma.feedbackRecord.findMany({
    where,
    select: {
      trainer: { select: { id: true, name: true, subjectSpecialties: true, college: { select: { name: true } } } },
    },
  });

  const trainersMap = new Map();
  records.forEach((r) => {
    if (r.trainer?.id) {
      const t = r.trainer;
      trainersMap.set(String(t.id), {
        id: String(t.id),
        name: t.name,
        subject: Array.isArray(t.subjectSpecialties) ? t.subjectSpecialties.join(" & ") : "All Subjects",
        college: t.college ? t.college.name : "All Colleges",
      });
    }
  });

  const list = Array.from(trainersMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return [{ id: "overall", name: "Overall Classification", subject: "All Trainers & Subjects", college: "All Colleges" }, ...list];
};

export const getTrainerMetrics = async (trainerId, queryParams = {}) => {
  const { college, course } = queryParams;
  const where = { status: "active" };

  if (college && college !== "All Colleges") {
    where.college = { name: college };
  }
  if (course && course !== "All Courses") {
    where.course = { title: course };
  }

  if (trainerId && trainerId !== "overall") {
    const idNum = parseInt(trainerId, 10);
    const trainer = await prisma.trainer.findFirst({
      where: {
        OR: [{ id: isNaN(idNum) ? -1 : idNum }, { name: trainerId }],
      },
    });

    if (trainer) {
      where.trainerId = trainer.id;
    }
  }

  const records = await prisma.feedbackRecord.findMany({
    where,
    select: { sentiment: true, aiKeywords: true, feedbackText: true, batchId: true, rating: true },
  });

  const totalReviews = records.length;

  if (totalReviews === 0) {
    return {
      overallRating: 0,
      totalReviews: 0,
      satisfaction: 0,
      totalBatches: 0,
      totalSessions: 0,
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

  // Count distinct batches matching these records
  const batchIdsSet = new Set(records.map((r) => r.batchId).filter(Boolean));
  const totalBatches = batchIdsSet.size;
  const totalSessions = totalBatches * 20;

  // Extract strengths and weaknesses from keywords in positive & negative feedback
  const posKeywords = {};
  const negKeywords = {};

  records.forEach((r) => {
    const kws = Array.isArray(r.aiKeywords) ? r.aiKeywords : [];
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

  return {
    overallRating: Number(avgRating.toFixed(1)),
    totalReviews,
    satisfaction,
    totalBatches,
    totalSessions,
    monthlyTrend: [
      { month: "Jan", rating: Number(avgRating.toFixed(1)) },
      { month: "Feb", rating: Number(avgRating.toFixed(1)) },
      { month: "Mar", rating: Number(avgRating.toFixed(1)) },
      { month: "Apr", rating: Number(avgRating.toFixed(1)) },
      { month: "May", rating: Number(avgRating.toFixed(1)) },
      { month: "Jun", rating: Number(avgRating.toFixed(1)) },
      { month: "Jul", rating: Number(avgRating.toFixed(1)) },
    ],
    strengths: topPos.length > 0 ? topPos : ["Strong overall student feedback"],
    weaknesses: topNeg.length > 0 ? topNeg : ["No major negative feedback reported"],
    recommendations: ["Continue tracking student responses for upcoming batches"],
  };
};
