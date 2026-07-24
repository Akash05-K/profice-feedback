import prisma from "../config/db.js";
import { getFeedbackRecords, exportFeedbackRecords } from "./feedback.service.js";
import { generateFeedbackPdf } from "../utils/pdfGenerator.js";

export const getReportsData = async (queryParams) => {
  const result = await getFeedbackRecords(queryParams);
  const records = result.data;

  // Build Prisma where clause for full unpaginated KPIs
  const { college, course, trainer, sentiment, rating, student, startDate, endDate, search } = queryParams;
  const where = { status: "active" };

  if (college && college !== "all" && college !== "All Colleges") {
    where.college = { name: college };
  }
  if (course && course !== "all" && course !== "All Courses") {
    where.course = { title: course };
  }
  if (trainer && trainer !== "all" && trainer !== "All Trainers") {
    where.trainer = { name: trainer };
  }
  if (sentiment && sentiment !== "all") {
    where.sentiment = sentiment;
  }
  if (rating && rating !== "all") {
    where.rating = parseInt(rating, 10);
  }
  if (student && student.trim()) {
    where.studentName = { contains: student.trim() };
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { studentName: { contains: term } },
      { feedbackText: { contains: term } },
      { trainer: { name: { contains: term } } },
      { course: { title: { contains: term } } },
      { college: { name: { contains: term } } },
    ];
  }

  const total = await prisma.feedbackRecord.count({ where });

  let avgRating = "0.0";
  let satisfaction = 0;
  let positivePercent = 0;
  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  if (total > 0) {
    const avgResult = await prisma.feedbackRecord.aggregate({
      where,
      _avg: { rating: true },
    });
    avgRating = (avgResult._avg.rating || 0).toFixed(1);

    const satisfiedCount = await prisma.feedbackRecord.count({
      where: { ...where, rating: { gte: 3 } },
    });
    satisfaction = Math.round((satisfiedCount / total) * 100);

    // With a sentiment filter active every matching record is that sentiment,
    // so counting the other two would overshoot the filtered total.
    const countBySentiment = async (value) => {
      if (where.sentiment) return where.sentiment === value ? total : 0;
      return prisma.feedbackRecord.count({ where: { ...where, sentiment: value } });
    };

    posCount = await countBySentiment("positive");
    neuCount = await countBySentiment("neutral");
    negCount = await countBySentiment("negative");

    positivePercent = Math.round((posCount / total) * 100);
  }

  const denom = Math.max(1, total);

  const sentimentDistribution = [
    { name: "Positive", value: Math.round((posCount / denom) * 100), count: String(posCount), color: "#16A34A" },
    { name: "Neutral", value: Math.round((neuCount / denom) * 100), count: String(neuCount), color: "#F59E0B" },
    { name: "Negative", value: Math.round((negCount / denom) * 100), count: String(negCount), color: "#EF4444" },
  ];

  return {
    kpis: {
      total,
      avgRating,
      satisfaction,
      positivePercent,
    },
    sentimentDistribution,
    records,
    pagination: result.pagination,
  };
};

export const exportReportsPdf = async (queryParams) => {
  const { kpis, records } = await getReportsData({ ...queryParams, limit: 1000 });
  const filterInfo = `College: ${queryParams.college || "All"} | Course: ${queryParams.course || "All"} | Trainer: ${queryParams.trainer || "All"}`;
  const pdfBuffer = generateFeedbackPdf(records, kpis, filterInfo);

  return {
    buffer: Buffer.from(pdfBuffer),
    filename: `Feedback_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
    contentType: "application/pdf",
  };
};

export const exportReportsExcel = async (queryParams) => {
  return await exportFeedbackRecords({ ...queryParams, format: "xlsx" });
};

export const exportReportsCsv = async (queryParams) => {
  return await exportFeedbackRecords({ ...queryParams, format: "csv" });
};
