import prisma from "../config/db.js";
import { parseExcelOrCsv } from "../utils/fileParser.js";
import { generateFeedbackCode } from "../utils/codeGenerator.js";
import * as aiService from "./ai.service.js";
import { env } from "../config/env.js";
import { applyFeedbackScope, isUnrestricted } from "../utils/scope.js";

export const processUploadedFile = async (file, user, userScope = null) => {
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
  const uploaderId = user ? user.id : (adminUser ? adminUser.id : 1);
  const userProgram = userScope?.program || user?.program || null;

  // A Program Manager with no program assigned has no trainers to file feedback
  // against — refuse rather than guessing and contaminating another team.
  if (userScope?.isProgramManager && !userProgram) {
    const error = new Error(
      "Your account has no program assigned. Ask an administrator to set your program before uploading feedback."
    );
    error.statusCode = 400;
    throw error;
  }

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

  // Rows naming a trainer or course that doesn't exist in the uploader's own
  // program create a new record rather than borrowing another program's. That
  // is the isolation guarantee, but it must not happen silently — these are
  // reported back so the uploader can spot a wrong-team spreadsheet.
  const createdTrainers = new Set();
  const createdCourses = new Set();

  const programWhere = userProgram ? { program: userProgram } : {};

  const defaultCollege = (await prisma.college.findFirst()) || { id: 1, name: "PSG College of Technology" };
  const defaultCourse = (await prisma.course.findFirst({ where: programWhere })) || (await prisma.course.findFirst()) || { id: 1, title: "M.Sc Data Science" };
  const defaultTrainer = (await prisma.trainer.findFirst({ where: programWhere })) || (await prisma.trainer.findFirst()) || { id: 1, name: "Harish" };

  const existingRecords = await prisma.feedbackRecord.findMany({
    select: { feedbackCode: true },
  });
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

    let rating = 4;
    if (ratingKey && row[ratingKey]) {
      rating = Number(row[ratingKey]) || 4;
    }

    const aiResult = aiClassification.get(i);
    let sentiment;
    if (aiResult) {
      sentiment = aiResult.sentiment;
    } else if (sentimentKey && row[sentimentKey]) {
      const val = String(row[sentimentKey]).toLowerCase();
      if (val.includes("pos")) sentiment = "positive";
      else if (val.includes("neg")) sentiment = "negative";
      else sentiment = "neutral";
    } else {
      if (rating >= 4) sentiment = "positive";
      else if (rating === 3) sentiment = "neutral";
      else sentiment = "negative";
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
      // Scoped uploaders only ever match trainers inside their own program. The
      // previous global fallback let an IBM manager's sheet attach feedback to
      // an Oracle trainer with the same name.
      let foundTrainer = await prisma.trainer.findFirst({
        where: userProgram ? { name: trainerName, program: userProgram } : { name: trainerName },
      });

      if (!foundTrainer && !userProgram) {
        foundTrainer = await prisma.trainer.findFirst({ where: { name: trainerName } });
      }

      if (!foundTrainer) {
        foundTrainer = await prisma.trainer.create({
          data: { name: trainerName, collegeId, program: userProgram, subjectSpecialties: JSON.stringify(["General Instruction"]) },
        });
        createdTrainers.add(trainerName);
      }
      trainerCache[`${collegeId}_${trainerName}`] = foundTrainer.id;
      trainerCache[trainerName] = foundTrainer.id;
      trainerId = foundTrainer.id;
    }

    // 3. Resolve Course
    const courseTitle = courseKey && row[courseKey] ? String(row[courseKey]).trim() : defaultCourse.title;
    let courseId = defaultCourse.id;
    if (courseCache[`${collegeId}_${courseTitle}`]) {
      courseId = courseCache[`${collegeId}_${courseTitle}`];
    } else {
      // Same rule as trainers: never reuse another program's course row.
      let foundCourse = await prisma.course.findFirst({
        where: userProgram
          ? { title: courseTitle, collegeId, program: userProgram }
          : { title: courseTitle, collegeId },
      });

      if (!foundCourse && !userProgram) {
        foundCourse = await prisma.course.findFirst({ where: { title: courseTitle, collegeId } });
      }

      if (!foundCourse) {
        foundCourse = await prisma.course.create({
          data: { title: courseTitle, category: "General", durationWeeks: 12, collegeId, program: userProgram },
        });
        createdCourses.add(courseTitle);
      }
      courseCache[`${collegeId}_${courseTitle}`] = foundCourse.id;
      courseCache[courseTitle] = foundCourse.id;
      courseId = foundCourse.id;
    }

    // 4. Resolve Batch
    const rawBatchCode = batchKey && row[batchKey] ? String(row[batchKey]).trim() : null;
    const batchCode = rawBatchCode || `BATCH-${trainerId}-${courseId}`;
    let batchId = null;
    if (batchCache[batchCode]) {
      batchId = batchCache[batchCode];
    } else {
      let foundBatch = await prisma.batch.findUnique({ where: { batchCode } });
      if (!foundBatch) {
        foundBatch = await prisma.batch.create({
          data: { batchCode, courseId, trainerId, totalStudents: 30 },
        });
      }
      batchCache[batchCode] = foundBatch.id;
      batchId = foundBatch.id;
    }

    const feedbackCode = generateFeedbackCode(currentCodeNum++);
    const aiKws = aiResult && aiResult.keywords.length > 0 ? JSON.stringify(aiResult.keywords) : null;
    const aiConf = aiResult ? aiResult.confidence : null;

    await prisma.feedbackRecord.create({
      data: {
        feedbackCode,
        studentName,
        department,
        batchId,
        courseId,
        trainerId,
        collegeId,
        rating,
        sentiment,
        feedbackText: text,
        aiKeywords: aiKws,
        aiConfidence: aiConf,
        status: "active",
        uploadSessionId: uploadSession.id,
      },
    });
  }

  const total = rows.length;
  const updatedSession = await prisma.uploadSession.update({
    where: { id: uploadSession.id },
    data: {
      processedRows: total,
      status: "completed",
      summary: `Processed ${total} feedback records: ${positive} positive, ${neutral} neutral, ${negative} negative.`,
    },
  });

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
    newTrainers: [...createdTrainers],
    newCourses: [...createdCourses],
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

export const getUploadSessions = async (userScope = null) => {
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

  // A scoped user only sees sessions that actually contain their own trainers'
  // feedback — "the manager only [sees] the feedbacks of trainer under him".
  const sessionWhere = isUnrestricted(userScope)
    ? {}
    : { feedbackRecords: { some: applyFeedbackScope({}, userScope) } };

  return await prisma.uploadSession.findMany({
    where: sessionWhere,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
};

/**
 * Load an upload session the caller is allowed to touch, or throw 404.
 *
 * Scoped callers must own at least one feedback record in the session. Both the
 * analysis and delete paths previously looked the session up by raw id, which
 * let one manager read another's filename and delete their session outright.
 */
const findSessionInScope = async (sessionId, userScope) => {
  const sessIdNum = parseInt(sessionId, 10);
  if (isNaN(sessIdNum)) {
    const error = new Error("Invalid session ID.");
    error.statusCode = 400;
    throw error;
  }

  const session = await prisma.uploadSession.findFirst({
    where: isUnrestricted(userScope)
      ? { id: sessIdNum }
      : { id: sessIdNum, feedbackRecords: { some: applyFeedbackScope({}, userScope) } },
  });

  if (!session) {
    const error = new Error("Upload session not found.");
    error.statusCode = 404;
    throw error;
  }

  return session;
};

export const getUploadSessionAnalysis = async (sessionId, userScope = null) => {
  const session = await findSessionInScope(sessionId, userScope);

  const records = await prisma.feedbackRecord.findMany({
    where: applyFeedbackScope({ uploadSessionId: session.id }, userScope),
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
      ? "No feedback records were found for your program in this file."
      : `This file contains ${total} feedback records for your program: ${positive} positive, ${neutral} neutral and ${negative} negative.`;

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

export const deleteUploadSession = async (sessionId, userScope = null) => {
  const session = await findSessionInScope(sessionId, userScope);

  const deleted = await prisma.feedbackRecord.deleteMany({
    where: applyFeedbackScope({ uploadSessionId: session.id }, userScope),
  });

  // Only drop the session row once nothing out of scope is left inside it, so a
  // shared upload isn't erased from under another program.
  const remaining = await prisma.feedbackRecord.count({
    where: { uploadSessionId: session.id },
  });

  if (remaining === 0) {
    await prisma.uploadSession.delete({ where: { id: session.id } }).catch(() => {});
  }

  return {
    sessionId: session.id,
    filename: session.filename,
    deletedRecords: deleted.count,
  };
};