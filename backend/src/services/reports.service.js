import prisma from "../config/db.js";
import { getFeedbackRecords, exportFeedbackRecords } from "./feedback.service.js";
import { generateFeedbackPdf } from "../utils/pdfGenerator.js";

export const getReportsData = async (queryParams) => {
  const result = await getFeedbackRecords(queryParams);
  const records = result.data;

  const total = result.pagination.total;
  let avgRating = "0.0";
  let satisfaction = 0;
  let positivePercent = 0;

  if (total > 0) {
    const sumRating = records.reduce((sum, r) => sum + r.rating, 0);
    avgRating = (sumRating / records.length).toFixed(1);

    const satisfiedCount = records.filter((r) => r.rating >= 3).length;
    satisfaction = Math.round((satisfiedCount / records.length) * 100);

    const positiveCount = records.filter((r) => r.sentiment === "positive").length;
    positivePercent = Math.round((positiveCount / records.length) * 100);
  }

  const posCount = records.filter((r) => r.sentiment === "positive").length;
  const neuCount = records.filter((r) => r.sentiment === "neutral").length;
  const negCount = records.filter((r) => r.sentiment === "negative").length;
  const denom = Math.max(1, records.length);

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
  const filterInfo = `Trainer: ${queryParams.trainer || "All"} | Course: ${queryParams.course || "All"} | Batch: ${queryParams.batch || "All"}`;
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
