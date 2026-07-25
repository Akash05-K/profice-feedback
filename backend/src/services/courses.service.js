import prisma from "../config/db.js";
import * as aiService from "./ai.service.js";
import { buildRatingTrend } from "./trainers.service.js";

export const getCourseFilterOptions = async (queryParams = {}) => {
  const { college } = queryParams;

  const records = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    select: {
      college: { select: { name: true } },
      course: { select: { id: true, title: true, category: true, durationWeeks: true } },
    },
  });

  const collegesSet = new Set();
  const coursesMap = new Map();

  records.forEach((r) => {
    if (r.college?.name) collegesSet.add(r.college.name);

    const matchCollege = !college || college === "All Colleges" || r.college?.name === college;
    if (r.course?.id && r.course?.title && matchCollege) {
      coursesMap.set(String(r.course.id), {
        id: String(r.course.id),
        name: r.course.title,
        category: r.course.category || "General",
        duration: `${r.course.durationWeeks || 12} weeks`,
        college: r.college ? r.college.name : "All Colleges",
      });
    }
  });

  const coursesList = Array.from(coursesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    colleges: ["All Colleges", ...Array.from(collegesSet).sort()],
    courses: [
      { id: "overall", name: "Overall Classification", category: "All Categories", duration: "All Courses", college: "All Colleges" },
      ...coursesList,
    ],
  };
};

export const getCoursesList = async (collegeName) => {
  const where = { status: "active" };
  if (collegeName && collegeName !== "All Colleges") {
    where.college = { name: collegeName };
  }

  const records = await prisma.feedbackRecord.findMany({
    where,
    select: {
      course: { select: { id: true, title: true, category: true, durationWeeks: true, college: { select: { name: true } } } },
    },
  });

  const coursesMap = new Map();
  records.forEach((r) => {
    if (r.course?.id) {
      const c = r.course;
      coursesMap.set(String(c.id), {
        id: String(c.id),
        name: c.title,
        category: c.category || "General",
        duration: `${c.durationWeeks || 12} weeks`,
        college: c.college ? c.college.name : "All Colleges",
      });
    }
  });

  const list = Array.from(coursesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return [{ id: "overall", name: "Overall Classification", category: "All Categories", duration: "All Courses", college: "All Colleges" }, ...list];
};

export const getCourseMetrics = async (courseId, queryParams = {}) => {
  const { college } = queryParams;
  const where = { status: "active" };

  if (college && college !== "All Colleges") {
    where.college = { name: college };
  }

  if (courseId && courseId !== "overall") {
    const idNum = parseInt(courseId, 10);
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: isNaN(idNum) ? -1 : idNum }, { title: courseId }],
      },
    });

    if (course) {
      where.courseId = course.id;
    }
  }

  const records = await prisma.feedbackRecord.findMany({
    where,
    select: { id: true, rating: true, sentiment: true, aiKeywords: true, feedbackText: true, batchId: true, createdAt: true },
  });

  const totalReviews = records.length;

  if (totalReviews === 0) {
    return {
      courseRating: 0,
      satisfactionRate: 0,
      positiveRate: 0,
      enrolledStudents: 0,
      monthlyTrend: [],
      improvementSuggestions: [],
    };
  }

  const sumRating = records.reduce((acc, r) => acc + r.rating, 0);
  const ratingVal = Number((sumRating / totalReviews).toFixed(1));
  const satisfactionRate = Math.round((records.filter((r) => r.rating >= 3).length / totalReviews) * 100);
  const positiveRate = Math.round((records.filter((r) => r.sentiment === "positive").length / totalReviews) * 100);

  // Extract negative keywords for improvement suggestions
  const negMap = {};
  records.forEach((r) => {
    if (r.sentiment === "negative") {
      const kws = (() => { if (!r.aiKeywords) return []; if (Array.isArray(r.aiKeywords)) return r.aiKeywords; try { return JSON.parse(r.aiKeywords); } catch { return [r.aiKeywords]; } })();
      kws.forEach((kw) => {
        const clean = String(kw).toLowerCase().trim();
        if (clean) negMap[clean] = (negMap[clean] || 0) + 1;
      });
    }
  });

  const topNeg = Object.entries(negMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw]) => `Focus on resolving student feedback regarding ${kw}`);

  const fallbackSuggestions =
    topNeg.length > 0 ? topNeg : ["No critical improvement suggestions for this selection."];

  const courseLabel = courseId && courseId !== "overall" ? String(courseId) : "All courses";
  const { improvementSuggestions } = await aiService.generateCourseSuggestions(
    { courseLabel, records },
    { improvementSuggestions: fallbackSuggestions }
  );

  return {
    courseRating: ratingVal,
    satisfactionRate,
    positiveRate,
    enrolledStudents: totalReviews,
    // Real month-by-month average-rating trend (single, honest series).
    monthlyTrend: buildRatingTrend(records),
    improvementSuggestions,
  };
};
