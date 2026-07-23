import prisma from "../config/db.js";

export const getDashboardStats = async () => {
  const total = await prisma.feedbackRecord.count({ where: { status: "active" } });
  
  if (total === 0) {
    return {
      "total-feedback": { value: "0", change: "0%", changeLabel: "vs last month", trend: "up" },
      "average-rating": { value: "0.0", valueSuffix: "/ 5", change: "0%", changeLabel: "vs last month", trend: "up" },
      "satisfaction-score": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
      "positive-feedback": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
      "response-rate": { value: "90%", change: "7.1%", changeLabel: "vs last month", trend: "down" },
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

  return {
    "total-feedback": { value: String(total), change: "9%", changeLabel: "vs last month", trend: "up" },
    "average-rating": { value: String(avgRating), valueSuffix: "/ 5", change: "8.2%", changeLabel: "vs last month", trend: "up" },
    "satisfaction-score": { value: `${satisfactionScore}%`, change: "10%", changeLabel: "vs last month", trend: "up" },
    "positive-feedback": { value: `${positivePercent}%`, change: "5.6%", changeLabel: "vs last month", trend: "up" },
    "response-rate": { value: "90%", change: "7.1%", changeLabel: "vs last month", trend: "down" },
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

  const sortAndFormat = (map, defaultItems) => {
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count], index) => ({
        rank: index + 1,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: Math.min(95, Math.max(20, count * 15)),
      }));

    return sorted.length > 0 ? sorted : defaultItems;
  };

  const defaultAppreciated = [
    { rank: 1, label: "Teaching", value: 80 },
    { rank: 2, label: "Notes", value: 76 },
    { rank: 3, label: "Labs", value: 72 },
    { rank: 4, label: "Projects", value: 68 },
    { rank: 5, label: "Support", value: 65 },
  ];

  const defaultImprovement = [
    { rank: 1, label: "Labs", value: 62 },
    { rank: 2, label: "Doubt Support", value: 48 },
    { rank: 3, label: "Notes", value: 41 },
    { rank: 4, label: "Classroom", value: 36 },
    { rank: 5, label: "Timetable", value: 28 },
  ];

  return {
    appreciated: sortAndFormat(appreciatedMap, defaultAppreciated),
    improvement: sortAndFormat(improvementMap, defaultImprovement),
  };
};

export const getRecentFeedback = async () => {
  const records = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { course: true, college: true },
  });

  return records.map((r) => ({
    id: r.feedbackCode,
    sentiment: r.sentiment,
    text: r.feedbackText,
    author: r.course ? r.course.title : r.college ? r.college.name : "Student",
  }));
};
