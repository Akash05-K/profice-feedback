import prisma from "../config/db.js";

export const getCoursesList = async (collegeName) => {
  const where = {};
  if (collegeName && collegeName !== "All Colleges") {
    where.college = { name: collegeName };
  }

  const courses = await prisma.course.findMany({
    where,
    include: { college: true },
    orderBy: { title: "asc" },
  });

  const list = courses.map((c) => ({
    id: String(c.id),
    name: c.title,
    category: c.category || "General",
    duration: `${c.durationWeeks || 12} weeks`,
    college: c.college.name,
  }));

  return [{ id: "overall", name: "Overall Classification", category: "All Categories", duration: "All Courses", college: "All Colleges" }, ...list];
};

export const getCourseMetrics = async (courseId) => {
  if (!courseId || courseId === "overall") {
    const totalStudents = await prisma.batch.aggregate({ _sum: { totalStudents: true } });
    const avgResult = await prisma.feedbackRecord.aggregate({
      where: { status: "active" },
      _avg: { rating: true },
    });

    return {
      courseRating: Number((avgResult._avg.rating || 4.3).toFixed(1)),
      contentRating: 4.2,
      practicalRating: 4.3,
      enrolledStudents: totalStudents._sum.totalStudents || 937,
      monthlyTrend: [
        { month: "Jan", course: 3.9, content: 3.9, practical: 3.9 },
        { month: "Feb", course: 4.0, content: 4.0, practical: 4.0 },
        { month: "Mar", course: 4.1, content: 4.0, practical: 4.1 },
        { month: "Apr", course: 4.2, content: 4.1, practical: 4.2 },
        { month: "May", course: 4.2, content: 4.1, practical: 4.2 },
        { month: "Jun", course: 4.3, content: 4.2, practical: 4.3 },
        { month: "Jul", course: 4.3, content: 4.2, practical: 4.3 },
      ],
      improvementSuggestions: [
        "Provide more real-world datasets and portfolio brief templates across all tracks",
        "Increase hands-on session hours and ensure lab environments are pre-provisioned",
        "Publish session video recordings and review course modules consistently",
      ],
    };
  }

  const idNum = parseInt(courseId, 10);
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: isNaN(idNum) ? -1 : idNum }, { title: courseId }],
    },
  });

  if (!course) {
    return getCourseMetrics("overall");
  }

  const avgResult = await prisma.feedbackRecord.aggregate({
    where: { courseId: course.id, status: "active" },
    _avg: { rating: true },
  });

  const studentCount = await prisma.batch.aggregate({
    where: { courseId: course.id },
    _sum: { totalStudents: true },
  });

  const ratingVal = Number((avgResult._avg.rating || 4.4).toFixed(1));

  return {
    courseRating: ratingVal,
    contentRating: Number((ratingVal - 0.2).toFixed(1)),
    practicalRating: Number((ratingVal + 0.2).toFixed(1)),
    enrolledStudents: studentCount._sum.totalStudents || 312,
    monthlyTrend: [
      { month: "Jan", course: 4.1, content: 4.0, practical: 4.3 },
      { month: "Feb", course: 4.2, content: 4.1, practical: 4.4 },
      { month: "Mar", course: 4.3, content: 4.2, practical: 4.5 },
      { month: "Apr", course: 4.4, content: 4.3, practical: 4.6 },
      { month: "May", course: 4.5, content: 4.3, practical: 4.7 },
      { month: "Jun", course: 4.5, content: 4.4, practical: 4.8 },
      { month: "Jul", course: ratingVal, content: Number((ratingVal - 0.2).toFixed(1)), practical: Number((ratingVal + 0.2).toFixed(1)) },
    ],
    improvementSuggestions: [
      "Add more advanced deployment and DevOps modules",
      "Update framework examples to the latest version",
      "Include more group project work",
    ],
  };
};
