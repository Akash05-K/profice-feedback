import prisma from "../config/db.js";
import { parseExcelOrCsv } from "../utils/fileParser.js";
import { generateFeedbackCode } from "../utils/codeGenerator.js";
import * as aiService from "./ai.service.js";
import { env } from "../config/env.js";

export const processUploadedFile = async (file, userId) => {
  if (!file || !file.buffer) {
    const error = new Error("No file uploaded.");
    error.statusCode = 400;
    throw error;
  }

  const rows = parseExcelOrCsv(file.buffer);
  if (!rows || rows.length === 0) {
    const error = new Error("The uploaded Excel sheet is empty.");
    error.statusCode = 400;
    throw error;
  }

  const adminUser = await prisma.user.findFirst();
  const uploaderId = userId || (adminUser ? adminUser.id : 1);

  const uploadSession = await prisma.uploadSession.create({
    data: {
      uploadedBy: uploaderId,
      filename: file.originalname || "feedback_upload.xlsx",
      totalRows: rows.length,
      processedRows: 0,
      status: "processing",
    },
  });

  let positive = 0;
  let neutral = 0;
  let negative = 0;

  const defaultCollege = (await prisma.college.findFirst()) || { id: 1, name: "PSG College of Technology" };
  const defaultCourse = (await prisma.course.findFirst()) || { id: 1, title: "M.Sc Data Science" };
  const defaultTrainer = (await prisma.trainer.findFirst()) || { id: 1, name: "Harish" };

  // Fetch ALL existing feedback codes to find the true max numeric suffix across the DB
  const existingRecords = await prisma.feedbackRecord.findMany({
    select: { feedbackCode: true },
  });
  const usedCodes = new Set(existingRecords.map((r) => r.feedbackCode));
  let highestNum = 1042;
  existingRecords.forEach((r) => {
    if (r.feedbackCode) {
      const match = r.feedbackCode.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > highestNum) highestNum = num;
      }
    }
  });
  let currentCodeNum = highestNum + 1;
  const collegeCache = {};
  const courseCache = {};
  const trainerCache = {};
  const batchCache = {};

  // --- AI pass: classify sentiment + keywords from the feedback TEXT (batched) ---
  // Falls back per-row to rating/column-based sentiment when the AI is unavailable.
  const classifyItems = rows.map((row, i) => {
    const rKey = Object.keys(row).find((k) => k.toLowerCase().includes("rating"));
    const tKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("text") || k.toLowerCase().includes("feedback") || k.toLowerCase().includes("comment")
    );
    return {
      index: i,
      text: tKey && row[tKey] ? String(row[tKey]) : "",
      rating: rKey && row[rKey] ? Number(row[rKey]) || 4 : 4,
    };
  });
  const aiClassification = await aiService.classifyFeedbackBatch(classifyItems);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Key matchers
    const ratingKey = Object.keys(row).find((k) => k.toLowerCase().includes("rating"));
    const sentimentKey = Object.keys(row).find((k) => k.toLowerCase().includes("sentiment"));
    const textKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("text") || k.toLowerCase().includes("feedback") || k.toLowerCase().includes("comment")
    );
    const studentKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("student") || k.toLowerCase().includes("name")
    );
    const collegeKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("college") || k.toLowerCase().includes("institution")
    );
    const courseKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("course") || k.toLowerCase().includes("subject")
    );
    const trainerKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("trainer") || k.toLowerCase().includes("faculty")
    );
    const batchKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("batch") || k.toLowerCase().includes("cohort")
    );
    const deptKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes("department") || k.toLowerCase().includes("dept")
    );

    // Parse Rating
    let rating = 4;
    if (ratingKey && row[ratingKey]) {
      rating = Number(row[ratingKey]) || 4;
    }

    // Sentiment: AI text analysis first, then column, then rating-based fallback.
    const aiResult = aiClassification.get(i);
    let sentiment;
    let sentimentSource;
    if (aiResult) {
      sentiment = aiResult.sentiment;
      sentimentSource = "ai";
    } else if (sentimentKey && row[sentimentKey]) {
      const val = String(row[sentimentKey]).toLowerCase();
      if (val.includes("pos")) sentiment = "positive";
      else if (val.includes("neg")) sentiment = "negative";
      else sentiment = "neutral";
      sentimentSource = "column";
    } else {
      if (rating >= 4) sentiment = "positive";
      else if (rating === 3) sentiment = "neutral";
      else sentiment = "negative";
      sentimentSource = "rating";
    }

    if (sentiment === "positive") positive++;
    else if (sentiment === "neutral") neutral++;
    else negative++;

    const text = textKey && row[textKey] ? String(row[textKey]) : "Student provided valuable course feedback.";
    const studentName = studentKey && row[studentKey] ? String(row[studentKey]) : `Student #${i + 1}`;
    const department = deptKey && row[deptKey] ? String(row[deptKey]) : "Computer Applications";

    // 1. Resolve College
    const collegeName = collegeKey && row[collegeKey] ? String(row[collegeKey]).trim() : defaultCollege.name;
    let collegeId = defaultCollege.id;
    if (collegeCache[collegeName]) {
      collegeId = collegeCache[collegeName];
    } else {
      let foundCollege = await prisma.college.findFirst({ where: { name: collegeName } });
      if (!foundCollege) {
        foundCollege = await prisma.college.create({ data: { name: collegeName, city: "Coimbatore" } });
      }
      collegeCache[collegeName] = foundCollege.id;
      collegeId = foundCollege.id;
    }

    // 2. Resolve Trainer
    const trainerName = trainerKey && row[trainerKey] ? String(row[trainerKey]).trim() : defaultTrainer.name;
    let trainerId = defaultTrainer.id;
    if (trainerCache[`${collegeId}_${trainerName}`]) {
      trainerId = trainerCache[`${collegeId}_${trainerName}`];
    } else {
      let foundTrainer = await prisma.trainer.findFirst({ where: { name: trainerName, collegeId } });
      if (!foundTrainer) {
        foundTrainer = await prisma.trainer.create({
          data: { name: trainerName, collegeId, subjectSpecialties: JSON.stringify(["General Instruction"]) },
        });
      }
      trainerCache[`${collegeId}_${trainerName}`] = foundTrainer.id;
      trainerId = foundTrainer.id;
    }

    // 3. Resolve Course
    const courseTitle = courseKey && row[courseKey] ? String(row[courseKey]).trim() : defaultCourse.title;
    let courseId = defaultCourse.id;
    if (courseCache[`${collegeId}_${courseTitle}`]) {
      courseId = courseCache[`${collegeId}_${courseTitle}`];
    } else {
      let foundCourse = await prisma.course.findFirst({ where: { title: courseTitle, collegeId } });
      if (!foundCourse) {
        foundCourse = await prisma.course.create({
          data: { title: courseTitle, category: "General", durationWeeks: 12, collegeId },
        });
      }
      courseCache[`${collegeId}_${courseTitle}`] = foundCourse.id;
      courseId = foundCourse.id;
    }

    // 4. Resolve Batch
    const batchCode = batchKey && row[batchKey] ? String(row[batchKey]).trim() : "GEN-B01";
    let batchId = null;
    if (batchCache[batchCode]) {
      batchId = batchCache[batchCode];
    } else {
      let foundBatch = await prisma.batch.findFirst({ where: { batchCode } });
      if (!foundBatch) {
        try {
          foundBatch = await prisma.batch.create({
            data: { batchCode, courseId, trainerId, totalStudents: 30 },
          });
        } catch (err) {
          foundBatch = await prisma.batch.findFirst({ where: { batchCode } });
        }
      }
      if (foundBatch) {
        batchCache[batchCode] = foundBatch.id;
        batchId = foundBatch.id;
      }
    }

    let code = `FB-${currentCodeNum}`;
    while (usedCodes.has(code)) {
      currentCodeNum++;
      code = `FB-${currentCodeNum}`;
    }
    usedCodes.add(code);
    currentCodeNum++;

    // Keywords: AI-extracted when available, else a naive text extraction fallback.
    let keywords;
    if (aiResult && aiResult.keywords.length > 0) {
      keywords = aiResult.keywords;
    } else {
      const textWords = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const stopWords = new Set(["with", "this", "that", "from", "have", "were", "very", "good", "more", "some", "they"]);
      const extractedKw = Array.from(new Set(textWords.filter((w) => !stopWords.has(w)))).slice(0, 4);
      keywords = extractedKw.length > 0 ? extractedKw : ["teaching", "explanation", "practical"];
    }

    // Confidence reflects how the sentiment was derived (AI text analysis is highest).
    const confidence = sentimentSource === "ai" ? 0.95 : sentimentSource === "column" ? 0.8 : 0.6;

    await prisma.feedbackRecord.create({
      data: {
        feedbackCode: code,
        studentName,
        department,
        courseId,
        trainerId,
        collegeId,
        batchId,
        rating,
        sentiment,
        feedbackText: text,
        aiKeywords: JSON.stringify(keywords),
        aiConfidence: confidence,
        status: "active",
        uploadSessionId: uploadSession.id,
      },
    });
  }

  const updatedSession = await prisma.uploadSession.update({
    where: { id: uploadSession.id },
    data: {
      processedRows: rows.length,
      status: "completed",
     summary: JSON.stringify({ positive, neutral, negative }),
    },
  });

  const total = rows.length;
  const denominator = Math.max(1, total);

  const sentimentData = [
    { name: "Positive", value: Math.round((positive / denominator) * 100), count: String(positive), color: "#16A34A" },
    { name: "Neutral", value: Math.round((neutral / denominator) * 100), count: String(neutral), color: "#F59E0B" },
    { name: "Negative", value: Math.round((negative / denominator) * 100), count: String(negative), color: "#EF4444" },
  ];

  return {
    uploadSessionId: updatedSession.id,
    analyzedCount: total.toLocaleString(),
    sentimentData,
    actions:
      negative > 0
        ? [
            "Address newly reported doubt clearing bottlenecks",
            "Optimize lab timing schedule due to student comments",
            "Review course speed pace for beginners",
          ]
        : ["Maintain current teaching methodology", "Share positive feedback with department head"],
  };
};

export const getUploadSessions = async () => {
  // Auto-heal any stale processing sessions if nodemon/server restarted mid-upload
  const processingSessions = await prisma.uploadSession.findMany({
    where: { status: "processing" },
  });

  for (const s of processingSessions) {
    const recordCount = await prisma.feedbackRecord.count({
      where: { uploadSessionId: s.id },
    });
    await prisma.uploadSession.update({
      where: { id: s.id },
      data: {
        processedRows: recordCount > 0 ? recordCount : s.totalRows,
        status: "completed",
      },
    });
  }

  return await prisma.uploadSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
};

export const getUploadSessionAnalysis = async (sessionId) => {
  const sessIdNum = parseInt(sessionId, 10);
  if (isNaN(sessIdNum)) {
    const error = new Error("Invalid session ID.");
    error.statusCode = 400;
    throw error;
  }

  const session = await prisma.uploadSession.findUnique({
    where: { id: sessIdNum },
  });

  if (!session) {
    const error = new Error("Upload session not found.");
    error.statusCode = 404;
    throw error;
  }

  const records = await prisma.feedbackRecord.findMany({
    where: { uploadSessionId: sessIdNum },
  });

  const total = records.length;
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let confidenceSum = 0;
  const keywordMap = {};

  records.forEach((r) => {
    if (r.sentiment === "positive") positive++;
    else if (r.sentiment === "negative") negative++;
    else neutral++;

    confidenceSum += typeof r.aiConfidence === "number" ? r.aiConfidence : 0;

    let kws = [];
    if (r.aiKeywords) {
      if (Array.isArray(r.aiKeywords)) {
        kws = r.aiKeywords;
      } else {
        try {
          kws = JSON.parse(r.aiKeywords);
        } catch {
          kws = [];
        }
      }
    }
    if (!Array.isArray(kws)) kws = [];

    kws.forEach((kw) => {
      const clean = String(kw).toLowerCase().trim();
      if (clean) {
        keywordMap[clean] = (keywordMap[clean] || 0) + 1;
      }
    });
  });

  const denominator = Math.max(1, total);

  const sentimentData = [
    { name: "Positive", value: Math.round((positive / denominator) * 100), count: String(positive), color: "#16A34A" },
    { name: "Neutral", value: Math.round((neutral / denominator) * 100), count: String(neutral), color: "#F59E0B" },
    { name: "Negative", value: Math.round((negative / denominator) * 100), count: String(negative), color: "#EF4444" },
  ];

  const keywords = Object.entries(keywordMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }));

  const fallbackActions = negative > 0
    ? [
        "Address newly reported doubt clearing bottlenecks in this upload",
        "Optimize lab timing schedule due to student comments",
        "Review course speed pace for beginners",
      ]
    : ["Maintain current teaching methodology", "Share positive feedback with department head"];

  const fallbackSummary =
    total === 0
      ? "No feedback records were found in this file."
      : `This file contains ${total} feedback records: ${positive} positive, ${neutral} neutral and ${negative} negative.`;

  // Gemini generates the real summary + actions; falls back to the rule-based output.
  const { summary, actions } = await aiService.generateSessionInsights(
    { filename: session.filename, records, counts: { positive, neutral, negative, total } },
    { summary: fallbackSummary, actions: fallbackActions }
  );

  const avgConfidence = total > 0 ? Math.round((confidenceSum / total) * 1000) / 10 : 0;

  return {
    sessionId: session.id,
    filename: session.filename,
    createdAt: session.createdAt,
    analyzedCount: total.toLocaleString(),
    sentimentData,
    keywords,
    summary,
    actions,
    aiConfidence: { value: `${avgConfidence}%`, label: avgConfidence >= 85 ? "High Confidence" : "Moderate Confidence" },
    model: aiService.isAiEnabled() ? env.GEMINI_MODEL : "keyword-fallback",
  };
};

export const deleteUploadSession = async (sessionId) => {
  const sessIdNum = parseInt(sessionId, 10);
  if (isNaN(sessIdNum)) {
    const error = new Error("Invalid session ID.");
    error.statusCode = 400;
    throw error;
  }

  const session = await prisma.uploadSession.findUnique({
    where: { id: sessIdNum },
  });

  if (!session) {
    const error = new Error("Upload session not found.");
    error.statusCode = 404;
    throw error;
  }

  // Delete all feedback records belonging to this upload session
  const deleted = await prisma.feedbackRecord.deleteMany({
    where: { uploadSessionId: sessIdNum },
  });

  // Delete the upload session itself
  await prisma.uploadSession.delete({
    where: { id: sessIdNum },
  });

  return {
    sessionId: sessIdNum,
    filename: session.filename,
    deletedRecords: deleted.count,
  };
};
