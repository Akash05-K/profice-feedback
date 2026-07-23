import prisma from "../config/db.js";
import { parseExcelOrCsv } from "../utils/fileParser.js";
import { generateFeedbackCode } from "../utils/codeGenerator.js";

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
  const defaultTrainer = (await prisma.trainer.findFirst()) || { id: 1, name: "Dr. Kumar" };

  const existingCount = await prisma.feedbackRecord.count();
  const collegeCache = {};
  const courseCache = {};
  const trainerCache = {};
  const batchCache = {};

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

    // Parse Sentiment
    let sentiment = "positive";
    if (sentimentKey && row[sentimentKey]) {
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
      let foundTrainer = await prisma.trainer.findFirst({ where: { name: trainerName, collegeId } });
      if (!foundTrainer) {
        foundTrainer = await prisma.trainer.create({
          data: { name: trainerName, collegeId, subjectSpecialties: ["General Instruction"] },
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
        foundBatch = await prisma.batch.create({
          data: { batchCode, courseId, trainerId, totalStudents: 30 },
        });
      }
      batchCache[batchCode] = foundBatch.id;
      batchId = foundBatch.id;
    }

    const code = generateFeedbackCode(existingCount + i);

    // Extract quick keywords from text
    const textWords = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const stopWords = new Set(["with", "this", "that", "from", "have", "were", "very", "good", "more", "some", "they"]);
    const extractedKw = Array.from(new Set(textWords.filter((w) => !stopWords.has(w)))).slice(0, 4);

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
        aiKeywords: extractedKw.length > 0 ? extractedKw : ["teaching", "explanation", "practical"],
        aiConfidence: 0.94,
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
      summary: { positive, neutral, negative },
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
  return await prisma.uploadSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
};
