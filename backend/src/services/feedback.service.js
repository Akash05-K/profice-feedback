import prisma from "../config/db.js";
import { getPagination, formatPaginatedResponse } from "../utils/pagination.js";
import * as XLSX from "xlsx";
import { stringify } from "csv-stringify/sync";

const applyScopeToWhere = (where, userScope) => {
  if (!userScope || userScope.isUnrestricted) return where;
  
  if (userScope.isProgramManager) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { trainerId: { in: userScope.trainerIds } },
          { courseId: { in: userScope.courseIds } },
          { trainer: { program: userScope.program } },
          { course: { program: userScope.program } },
        ],
      },
    ];
  } else if (userScope.isTrainer) {
    const scopeTrainerId = userScope.trainerId;
    where.trainerId = scopeTrainerId ? (Array.isArray(scopeTrainerId) ? { in: scopeTrainerId } : scopeTrainerId) : -1;
  }
  return where;
};

export const getFeedbackRecords = async (queryParams, userScope = null) => {
  const {
    college,
    course,
    trainer,
    sentiment,
    rating,
    student,
    text,
    startDate,
    endDate,
    search,
    sortBy = "newest",
    status = "active",
    page,
    limit,
  } = queryParams;

  const isAll = (val) => !val || val === "all" || val === "All Colleges" || val === "All Courses" || val === "All Trainers" || val === "overall";

  let where = { status };

  where = applyScopeToWhere(where, userScope);

  if (college && !isAll(college)) {
    where.college = { name: college };
  }

  if (course && !isAll(course)) {
    where.course = { title: course };
  }

  if (trainer && !isAll(trainer)) {
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

  if (text && text.trim()) {
    where.feedbackText = { contains: text.trim() };
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

  let orderBy = { createdAt: "desc" };
  switch (sortBy) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "student-asc":
      orderBy = { studentName: "asc" };
      break;
    case "student-desc":
      orderBy = { studentName: "desc" };
      break;
    case "college-asc":
      orderBy = { college: { name: "asc" } };
      break;
    case "college-desc":
      orderBy = { college: { name: "desc" } };
      break;
    case "course-asc":
      orderBy = { course: { title: "asc" } };
      break;
    case "course-desc":
      orderBy = { course: { title: "desc" } };
      break;
    case "trainer-asc":
      orderBy = { trainer: { name: "asc" } };
      break;
    case "trainer-desc":
      orderBy = { trainer: { name: "desc" } };
      break;
    case "rating-high":
    case "rating-desc":
      orderBy = { rating: "desc" };
      break;
    case "rating-low":
    case "rating-asc":
      orderBy = { rating: "asc" };
      break;
    case "date-asc":
      orderBy = { createdAt: "asc" };
      break;
    case "date-desc":
      orderBy = { createdAt: "desc" };
      break;
    case "sentiment-asc":
      orderBy = { sentiment: "asc" };
      break;
    case "sentiment-desc":
      orderBy = { sentiment: "desc" };
      break;
    case "text-asc":
      orderBy = { feedbackText: "asc" };
      break;
    case "text-desc":
      orderBy = { feedbackText: "desc" };
      break;
    case "status-asc":
      orderBy = { status: "asc" };
      break;
    case "status-desc":
      orderBy = { status: "desc" };
      break;
    case "newest":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const { page: currentPage, limit: pageSize, skip } = getPagination(page, limit, 20);

  const [records, total] = await prisma.$transaction([
    prisma.feedbackRecord.findMany({
      where,
      include: {
        college: true,
        course: true,
        trainer: true,
        batch: true,
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.feedbackRecord.count({ where }),
  ]);

  const formattedRows = records.map((r) => ({
    id: r.feedbackCode,
    student: r.studentName,
    course: r.course ? r.course.title : "N/A",
    subject: r.course ? r.course.title : "N/A",
    trainer: r.trainer ? r.trainer.name : "N/A",
    rating: r.rating,
    sentiment: r.sentiment,
    text: r.feedbackText,
    date: r.createdAt.toISOString().slice(0, 10),
    status: r.status,
    college: r.college ? r.college.name : "N/A",
    department: r.department || "Computer Science",
    batch: r.batch ? r.batch.batchCode : "GEN-B01",
    keywords: (() => { if (!r.aiKeywords) return []; if (Array.isArray(r.aiKeywords)) return r.aiKeywords; try { return JSON.parse(r.aiKeywords); } catch { return [r.aiKeywords]; } })(),
    confidence: typeof r.aiConfidence === "number" ? Math.round(r.aiConfidence * 100) : null,
  }));

  return formatPaginatedResponse(formattedRows, total, currentPage, pageSize);
};

export const getFeedbackFilterOptions = async (queryParams = {}, userScope = null) => {
  const { college, course } = queryParams;

  let where = { status: "active" };
  where = applyScopeToWhere(where, userScope);

  const records = await prisma.feedbackRecord.findMany({
    where,
    select: {
      college: { select: { name: true } },
      course: { select: { title: true } },
      trainer: { select: { name: true } },
    },
  });

  const collegesSet = new Set();
  const coursesSet = new Set();
  const trainersSet = new Set();

  // If program manager, also add assigned courses & trainers directly so empty feedback won't hide assigned options
  if (userScope?.isProgramManager) {
    (userScope.courseTitles || []).forEach((ct) => coursesSet.add(ct));
    (userScope.trainerNames || []).forEach((tn) => trainersSet.add(tn));
  }

  records.forEach((r) => {
    if (r.college?.name) collegesSet.add(r.college.name);

    const matchCollege = !college || college === "All Colleges" || college === "all" || r.college?.name === college;
    if (r.course?.title && matchCollege) {
      coursesSet.add(r.course.title);
    }

    const matchCourse = !course || course === "All Courses" || course === "all" || r.course?.title === course;
    if (r.trainer?.name && matchCollege && matchCourse) {
      trainersSet.add(r.trainer.name);
    }
  });

  return {
    colleges: ["All Colleges", ...Array.from(collegesSet).sort()],
    courses: ["All Courses", ...Array.from(coursesSet).sort()],
    trainers: ["All Trainers", ...Array.from(trainersSet).sort()],
  };
};

export const getFeedbackStats = async (userScope = null) => {
  const base = applyScopeToWhere({}, userScope);

  const total = await prisma.feedbackRecord.count({ where: { ...base } });
  const positive = await prisma.feedbackRecord.count({ where: { ...base, sentiment: "positive" } });
  const neutral = await prisma.feedbackRecord.count({ where: { ...base, sentiment: "neutral" } });
  const negative = await prisma.feedbackRecord.count({ where: { ...base, sentiment: "negative" } });

  const activeCount = await prisma.feedbackRecord.count({ where: { ...base, status: "active" } });
  const archivedCount = await prisma.feedbackRecord.count({ where: { ...base, status: "archived" } });

  const avgResult = await prisma.feedbackRecord.aggregate({
    where: { ...base },
    _avg: { rating: true },
  });
  const avgRating = (avgResult._avg.rating || 0).toFixed(1);

  return {
    total,
    positive,
    neutral,
    negative,
    avgRating,
    activeCount,
    archivedCount,
  };
};

export const getFeedbackById = async (id, userScope = null) => {
  let where = {
    OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { feedbackCode: id }],
  };

  where = applyScopeToWhere(where, userScope);

  const record = await prisma.feedbackRecord.findFirst({
    where,
    include: {
      college: true,
      course: true,
      trainer: true,
      batch: true,
    },
  });

  if (!record) {
    const error = new Error("Feedback record not found or access denied.");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: record.feedbackCode,
    student: record.studentName,
    course: record.course ? record.course.title : "N/A",
    subject: record.course ? record.course.title : "N/A",
    trainer: record.trainer ? record.trainer.name : "N/A",
    rating: record.rating,
    sentiment: record.sentiment,
    text: record.feedbackText,
    date: record.createdAt.toISOString().slice(0, 10),
    status: record.status,
    college: record.college ? record.college.name : "N/A",
    department: record.department || "Computer Applications",
    batch: record.batch ? record.batch.batchCode : "GEN-B01",
  };  
};

export const toggleFeedbackStatus = async (id, userScope = null) => {
  let where = {
    OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { feedbackCode: id }],
  };
  where = applyScopeToWhere(where, userScope);
  const record = await prisma.feedbackRecord.findFirst({ where });
  if (!record) {
    const error = new Error("Feedback record not found or access denied.");
    error.statusCode = 404;
    throw error;
  }
  const newStatus = record.status === "archived" ? "active" : "archived";
  const updated = await prisma.feedbackRecord.update({
    where: { id: record.id },
    data: { status: newStatus },
  });
  return { id: updated.feedbackCode, status: updated.status };
};
export const deleteFeedbackRecord = async (id, userScope = null) => {
  let where = {
    OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { feedbackCode: id }],
  };
  where = applyScopeToWhere(where, userScope);

  const record = await prisma.feedbackRecord.findFirst({ where });

  if (!record) {
    const error = new Error("Feedback record not found or access denied.");
    error.statusCode = 404;
    throw error;
  }

  await prisma.feedbackRecord.delete({ where: { id: record.id } });
  return { id: record.feedbackCode, deleted: true };
};

export const bulkActionFeedback = async ({ ids, action }, userScope = null) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    const error = new Error("No IDs provided for bulk action.");
    error.statusCode = 400;
    throw error;
  }

  let where = { feedbackCode: { in: ids } };
  where = applyScopeToWhere(where, userScope);

  if (action === "archive") {
    await prisma.feedbackRecord.updateMany({
      where,
      data: { status: "archived" },
    });
    return { count: ids.length, action: "archived" };
  } else if (action === "delete") {
    await prisma.feedbackRecord.deleteMany({ where });
    return { count: ids.length, action: "deleted" };
  } else if (action === "review") {
    return { count: ids.length, action: "reviewed" };
  } else {
    const error = new Error("Invalid bulk action.");
    error.statusCode = 400;
    throw error;
  }
};

export const exportFeedbackRecords = async (params = {}, userScope = null) => {
  const { ids, format = "xlsx", college, course, trainer, sentiment, rating, startDate, endDate, search, status } = params;

  const isAll = (val) =>
    !val || val === "all" || val === "All Colleges" || val === "All Courses" || val === "All Trainers" || val === "overall";

  let where = {};
  where = applyScopeToWhere(where, userScope);

  if (status && status !== "all") where.status = status;
  if (college && !isAll(college)) where.college = { name: college };
  if (course && !isAll(course)) where.course = { title: course };
  if (trainer && !isAll(trainer)) where.trainer = { name: trainer };
  if (sentiment && sentiment !== "all") where.sentiment = sentiment;
  if (rating && rating !== "all") where.rating = parseInt(rating, 10);
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

  let records = [];
  if (Array.isArray(ids) && ids.length > 0) {
    records = await prisma.feedbackRecord.findMany({
      where: { ...where, feedbackCode: { in: ids } },
      include: { college: true, course: true, trainer: true, batch: true },
    });
  } else {
    records = await prisma.feedbackRecord.findMany({
      where,
      take: 1000,
      orderBy: { createdAt: "desc" },
      include: { college: true, course: true, trainer: true, batch: true },
    });
  }

  const exportRows = records.map((r) => ({
    "Feedback ID": r.feedbackCode,
    Date: r.createdAt.toISOString().slice(0, 10),
    "Student Name": r.studentName,
    College: r.college ? r.college.name : "N/A",
    Course: r.course ? r.course.title : "N/A",
    Trainer: r.trainer ? r.trainer.name : "N/A",
    Batch: r.batch ? r.batch.batchCode : "GEN-B01",
    Rating: r.rating,
    Sentiment: r.sentiment.toUpperCase(),
    "Feedback Text": r.feedbackText,
  }));

  if (format === "csv") {
    const csvBuffer = stringify(exportRows, { header: true });
    return { buffer: Buffer.from(csvBuffer), filename: `feedback_export_${Date.now()}.csv`, contentType: "text/csv" };
  } else {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback Records");
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return {
      buffer: excelBuffer,
      filename: `feedback_export_${Date.now()}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
};
