import prisma from "../config/db.js";
import { getPagination, formatPaginatedResponse } from "../utils/pagination.js";
import { generateFeedbackCode } from "../utils/codeGenerator.js";
import * as XLSX from "xlsx";
import { stringify } from "csv-stringify/sync";

export const getFeedbackRecords = async (queryParams) => {
  const {
    college,
    course,
    trainer,
    sentiment,
    rating,
    startDate,
    endDate,
    search,
    sortBy = "newest",
    status = "active",
    page,
    limit,
  } = queryParams;

  const isAll = (val) => !val || val === "all" || val === "All Colleges" || val === "All Courses" || val === "All Trainers" || val === "overall";

  const where = { status };

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
      orderBy = { rating: "desc" };
      break;
    case "rating-low":
      orderBy = { rating: "asc" };
      break;
    case "sentiment-asc":
      orderBy = { sentiment: "asc" };
      break;
    case "sentiment-desc":
      orderBy = { sentiment: "desc" };
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
    course: r.course.title,
    subject: r.course.title,
    trainer: r.trainer.name,
    rating: r.rating,
    sentiment: r.sentiment,
    text: r.feedbackText,
    date: r.createdAt.toISOString().slice(0, 10),
    status: r.status,
    college: r.college.name,
    department: r.department || "Computer Science",
    batch: r.batch ? r.batch.batchCode : "GEN-B01",
  }));

  return formatPaginatedResponse(formattedRows, total, currentPage, pageSize);
};

export const getFeedbackFilterOptions = async (queryParams = {}) => {
  const { college, course } = queryParams;

  const records = await prisma.feedbackRecord.findMany({
    where: { status: "active" },
    select: {
      college: { select: { name: true } },
      course: { select: { title: true } },
      trainer: { select: { name: true } },
    },
  });

  const collegesSet = new Set();
  const coursesSet = new Set();
  const trainersSet = new Set();

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

export const getFeedbackStats = async () => {
  const total = await prisma.feedbackRecord.count();
  const positive = await prisma.feedbackRecord.count({ where: { sentiment: "positive" } });
  const neutral = await prisma.feedbackRecord.count({ where: { sentiment: "neutral" } });
  const negative = await prisma.feedbackRecord.count({ where: { sentiment: "negative" } });

  const activeCount = await prisma.feedbackRecord.count({ where: { status: "active" } });
  const archivedCount = await prisma.feedbackRecord.count({ where: { status: "archived" } });

  const avgResult = await prisma.feedbackRecord.aggregate({
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

export const getFeedbackById = async (id) => {
  const record = await prisma.feedbackRecord.findFirst({
    where: {
      OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { feedbackCode: id }],
    },
    include: {
      college: true,
      course: true,
      trainer: true,
      batch: true,
    },
  });

  if (!record) {
    const error = new Error("Feedback record not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: record.feedbackCode,
    student: record.studentName,
    course: record.course.title,
    subject: record.course.title,
    trainer: record.trainer.name,
    rating: record.rating,
    sentiment: record.sentiment,
    text: record.feedbackText,
    date: record.createdAt.toISOString().slice(0, 10),
    status: record.status,
    college: record.college.name,
    department: record.department || "Computer Applications",
    batch: record.batch ? record.batch.batchCode : "2024-2028",
  };
};

export const toggleFeedbackStatus = async (id) => {
  const record = await prisma.feedbackRecord.findFirst({
    where: {
      OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { feedbackCode: id }],
    },
  });

  if (!record) {
    const error = new Error("Feedback record not found.");
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

export const deleteFeedbackRecord = async (id) => {
  const record = await prisma.feedbackRecord.findFirst({
    where: {
      OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { feedbackCode: id }],
    },
  });

  if (!record) {
    const error = new Error("Feedback record not found.");
    error.statusCode = 404;
    throw error;
  }

  await prisma.feedbackRecord.delete({ where: { id: record.id } });
  return { id: record.feedbackCode, deleted: true };
};

export const bulkActionFeedback = async ({ ids, action }) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    const error = new Error("No IDs provided for bulk action.");
    error.statusCode = 400;
    throw error;
  }

  if (action === "archive") {
    await prisma.feedbackRecord.updateMany({
      where: { feedbackCode: { in: ids } },
      data: { status: "archived" },
    });
    return { count: ids.length, action: "archived" };
  } else if (action === "delete") {
    await prisma.feedbackRecord.deleteMany({
      where: { feedbackCode: { in: ids } },
    });
    return { count: ids.length, action: "deleted" };
  } else if (action === "review") {
    return { count: ids.length, action: "reviewed" };
  } else {
    const error = new Error("Invalid bulk action.");
    error.statusCode = 400;
    throw error;
  }
};

export const exportFeedbackRecords = async ({ ids, format = "xlsx" }) => {
  let records = [];
  if (Array.isArray(ids) && ids.length > 0) {
    records = await prisma.feedbackRecord.findMany({
      where: { feedbackCode: { in: ids } },
      include: { college: true, course: true, trainer: true, batch: true },
    });
  } else {
    records = await prisma.feedbackRecord.findMany({
      take: 1000,
      include: { college: true, course: true, trainer: true, batch: true },
    });
  }

  const exportRows = records.map((r) => ({
    "Feedback ID": r.feedbackCode,
    Date: r.createdAt.toISOString().slice(0, 10),
    "Student Name": r.studentName,
    College: r.college.name,
    Course: r.course.title,
    Trainer: r.trainer.name,
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
