import prisma from "../config/db.js";

export const getDashboardStats = async () => {
  const total = await prisma.feedbackRecord.count({ where: { status: "active" } });
  
  if (total === 0) {
    return {
      "total-feedback": { value: "0", change: "0%", changeLabel: "vs last month", trend: "up" },
      "average-rating": { value: "0.0", valueSuffix: "/ 5", change: "0%", changeLabel: "vs last month", trend: "up" },
      "satisfaction-score": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
      "positive-feedback": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
      "response-rate": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
    };
  }

  const avgResult = await prisma.feedbackRecord.aggregate({
    where: { status: "active" },
    _avg: { rating: true },
  });
  const avgRating = (avgResult._avg.rating || 0).toFixed(2);

  const satisfiedCount = await prisma.feedbackRecord.count({
    where: { status: "active", rating: { gte: 3 } },
  });
  const satisfactionScore = Math.round((satisfiedCount / total) * 100);

  const positiveCount = await prisma.feedbackRecord.count({
    where: { status: "active", sentiment: "positive" },
  });
  const positivePercent = Math.round((positiveCount / total) * 100);

  // Response rate based on total students in active batches
  const studentCountAgg = await prisma.batch.aggregate({
    _sum: { totalStudents: true },
  });
  const totalEnrolled = studentCountAgg._sum.totalStudents || 0;
  const responseRateVal = totalEnrolled > 0 ? Math.min(100, Math.round((total / totalEnrolled) * 100)) : 100;

  return {
    "total-feedback": { value: String(total), change: "+100%", changeLabel: "total records", trend: "up" },
    "average-rating": { value: String(avgRating), valueSuffix: "/ 5", change: "Overall", changeLabel: "avg score", trend: "up" },
    "satisfaction-score": { value: `${satisfactionScore}%`, change: "Overall", changeLabel: "satisfied", trend: "up" },
    "positive-feedback": { value: `${positivePercent}%`, change: "Overall", changeLabel: "positive sentiment", trend: "up" },
    "response-rate": { value: `${responseRateVal}%`, change: "Overall", changeLabel: "response rate", trend: "up" },
  };
};

export const getDashboardTrends = async () => {
  const records = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    select: { createdAt: true },
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const countsByMonth = {};

  monthNames.forEach((m) => {
    countsByMonth[m] = 0;
  });

  records.forEach((r) => {
    const month = monthNames[new Date(r.createdAt).getMonth()];
    countsByMonth[month] = (countsByMonth[month] || 0) + 1;
  });

  return monthNames.map((month) => ({
    month,
    feedback: countsByMonth[month] || 0,
  }));
};

export const getSentimentDistribution = async () => {
  const total = await prisma.feedbackRecord.count({ where: { status: "active" } });

  const pos = await prisma.feedbackRecord.count({ where: { status: "active", sentiment: "positive" } });
  const neu = await prisma.feedbackRecord.count({ where: { status: "active", sentiment: "neutral" } });
  const neg = await prisma.feedbackRecord.count({ where: { status: "active", sentiment: "negative" } });

  const denominator = Math.max(1, total);

  return [
    { name: "Positive", value: Math.round((pos / denominator) * 100), count: pos.toLocaleString(), color: "#16A34A" },
    { name: "Neutral", value: Math.round((neu / denominator) * 100), count: neu.toLocaleString(), color: "#F59E0B" },
    { name: "Negative", value: Math.round((neg / denominator) * 100), count: neg.toLocaleString(), color: "#EF4444" },
  ];
};

export const getTopTopics = async () => {
  const records = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    select: { sentiment: true, aiKeywords: true },
  });

  const appreciatedMap = {};
  const improvementMap = {};

  records.forEach((r) => {
    const keywords = Array.isArray(r.aiKeywords) ? r.aiKeywords : [];
    keywords.forEach((kw) => {
      const cleanKw = String(kw).toLowerCase().trim();
      if (!cleanKw) return;
      if (r.sentiment === "positive") {
        appreciatedMap[cleanKw] = (appreciatedMap[cleanKw] || 0) + 1;
      } else {
        improvementMap[cleanKw] = (improvementMap[cleanKw] || 0) + 1;
      }
    });
  });

  const sortAndFormat = (map) => {
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count], index) => ({
        rank: index + 1,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: Math.min(100, count * 20),
      }));
  };

  return {
    appreciated: sortAndFormat(appreciatedMap),
    improvement: sortAndFormat(improvementMap),
  };
};

export const getRecentFeedback = async () => {
  const records = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { course: true, college: true },
  });

  return records.map((r) => ({
    id: r.feedbackCode,
    sentiment: r.sentiment,
    text: r.feedbackText,
    author: `${r.studentName} (${r.course ? r.course.title : r.college ? r.college.name : "Student"})`,
  }));
};
