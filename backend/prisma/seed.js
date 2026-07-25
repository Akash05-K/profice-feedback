import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seed...");

  // 1. Create Admin User
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@profice.edu" },
    update: {},
    create: {
      email: "admin@profice.edu",
      name: "System Administrator",
      passwordHash,
      role: "super_admin",
      notificationPreferences: {
        create: {
          emailEnabled: true,
          inAppEnabled: true,
          remindersEnabled: true,
          weeklySummaryEnabled: true,
        },
      },
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // 1b. Demo users for every RBAC role (password shown for local testing only).
  // The trainer user's email matches a seeded Trainer record so data-scoping works.
  const demoUsers = [
    { email: "management@profice.edu", name: "Maya Management", role: "management", password: "manage123" },
    { email: "pm@profice.edu", name: "Pavan Program-Manager", role: "program_manager", password: "pm123" },
    { email: "acelead@profice.edu", name: "Asha ACE-Lead", role: "ace_lead", password: "ace123" },
    // Linked by email to the seeded Trainer "Dr. Kumar" (who has feedback) so trainer scoping is demoable.
    { email: "dr.kumar@psgtech.ac.in", name: "Dr. Kumar", role: "trainer", password: "trainer123" },
  ];

  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, passwordHash: hash },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: hash,
        role: u.role,
        notificationPreferences: {
          create: {
            emailEnabled: true,
            inAppEnabled: true,
            remindersEnabled: true,
            weeklySummaryEnabled: true,
          },
        },
      },
    });
    console.log(`✅ Demo ${u.role} user: ${u.email} / ${u.password}`);
  }

  // 2. Create Colleges
  const psg = await prisma.college.upsert({
    where: { name: "PSG College of Technology" },
    update: {},
    create: { name: "PSG College of Technology", city: "Coimbatore" },
  });

  const cit = await prisma.college.upsert({
    where: { name: "Coimbatore Institute of Technology" },
    update: {},
    create: { name: "Coimbatore Institute of Technology", city: "Coimbatore" },
  });

  const gct = await prisma.college.upsert({
    where: { name: "Government College of Technology" },
    update: {},
    create: { name: "Government College of Technology", city: "Coimbatore" },
  });

  console.log("✅ Colleges created.");

  // 3. Create Trainers
  const trainersData = [
    { name: "Dr. Kumar", email: "dr.kumar@psgtech.ac.in", collegeId: psg.id, specialties: ["Machine Learning & AI", "Data Structures", "Ethical Hacking", "VLSI Design"] },
    { name: "Prof. Priya", email: "prof.priya@psgtech.ac.in", collegeId: psg.id, specialties: ["Java Programming", "Embedded Systems", "Artificial Intelligence", "Software Testing"] },
    { name: "Dr. Arjun", email: "dr.arjun@cit.edu.in", collegeId: cit.id, specialties: ["Quantum Computing", "Python Programming", "Compiler Design", "Cryptography"] },
    { name: "Prof. Meena", email: "prof.meena@gct.ac.in", collegeId: gct.id, specialties: ["Python Programming", "Cloud Computing", "Big Data Analytics"] },
    { name: "Karthik S", email: "karthik.s@psgtech.ac.in", collegeId: psg.id, specialties: ["MERN Stack", "Python Programming"] },
    { name: "Priya N", email: "priya.n@psgtech.ac.in", collegeId: psg.id, specialties: ["Data Science"] },
    { name: "Arjun D", email: "arjun.d@cit.edu.in", collegeId: cit.id, specialties: ["UI/UX Design"] },
    { name: "Meera J", email: "meera.j@gct.ac.in", collegeId: gct.id, specialties: ["Cloud Computing"] },
  ];

  const trainersMap = {};
  for (const t of trainersData) {
    const trainer = await prisma.trainer.upsert({
      where: { email: t.email },
      update: {},
      create: {
        name: t.name,
        email: t.email,
        collegeId: t.collegeId,
        subjectSpecialties: JSON.stringify(t.specialties),
      },
    });
    trainersMap[t.name] = trainer;
  }
  console.log("✅ Trainers created.");

  // 4. Create Courses
  const coursesData = [
    { title: "M.Sc Theoretical Computer Science", category: "Computer Science", durationWeeks: 16, collegeId: psg.id },
    { title: "M.Sc Data Science", category: "Data & Analytics", durationWeeks: 16, collegeId: psg.id },
    { title: "M.Sc Software Systems", category: "Web Development", durationWeeks: 12, collegeId: psg.id },
    { title: "M.Sc Cyber Security", category: "Cyber Security", durationWeeks: 16, collegeId: psg.id },
    { title: "B.Tech AIDS", category: "Artificial Intelligence", durationWeeks: 16, collegeId: psg.id },
    { title: "B.Tech ECE", category: "Electronics", durationWeeks: 16, collegeId: psg.id },
    { title: "MERN Stack Development", category: "Web Development", durationWeeks: 12, collegeId: psg.id },
    { title: "Data Science", category: "Data & Analytics", durationWeeks: 16, collegeId: psg.id },
    { title: "UI/UX Design", category: "Design", durationWeeks: 10, collegeId: cit.id },
    { title: "Cloud Computing", category: "Cloud & DevOps", durationWeeks: 14, collegeId: gct.id },
    { title: "Python Programming", category: "Programming", durationWeeks: 8, collegeId: gct.id },
  ];

  const coursesMap = {};
  for (const c of coursesData) {
    let course = await prisma.course.findFirst({ where: { title: c.title } });
    if (!course) {
      course = await prisma.course.create({
        data: c,
      });
    }
    coursesMap[c.title] = course;
  }
  console.log("✅ Courses created.");

  // 5. Create Batches
  const batchesData = [
    { batchCode: "MERN-B12", courseTitle: "MERN Stack Development", trainerName: "Karthik S", totalStudents: 32 },
    { batchCode: "DS-B07", courseTitle: "Data Science", trainerName: "Priya N", totalStudents: 28 },
    { batchCode: "UIUX-B05", courseTitle: "UI/UX Design", trainerName: "Arjun D", totalStudents: 24 },
    { batchCode: "CLOUD-B09", courseTitle: "Cloud Computing", trainerName: "Meera J", totalStudents: 30 },
    { batchCode: "PY-B14", courseTitle: "Python Programming", trainerName: "Karthik S", totalStudents: 35 },
    { batchCode: "MERN-B13", courseTitle: "MERN Stack Development", trainerName: "Priya N", totalStudents: 29 },
    { batchCode: "DS-23PD", courseTitle: "M.Sc Data Science", trainerName: "Dr. Kumar", totalStudents: 30 },
    { batchCode: "MERN-23PW", courseTitle: "M.Sc Software Systems", trainerName: "Prof. Priya", totalStudents: 30 },
    { batchCode: "CLOUD-23PC", courseTitle: "M.Sc Cyber Security", trainerName: "Dr. Arjun", totalStudents: 25 },
    { batchCode: "PY-23PT", courseTitle: "M.Sc Theoretical Computer Science", trainerName: "Dr. Kumar", totalStudents: 28 },
    { batchCode: "UIUX-23PA", courseTitle: "B.Tech AIDS", trainerName: "Prof. Meena", totalStudents: 30 },
    { batchCode: "MERN-23PE", courseTitle: "B.Tech ECE", trainerName: "Prof. Priya", totalStudents: 25 },
  ];

  const batchesMap = {};
  for (const b of batchesData) {
    const course = coursesMap[b.courseTitle];
    const trainer = trainersMap[b.trainerName];
    if (course && trainer) {
      const batch = await prisma.batch.upsert({
        where: { batchCode: b.batchCode },
        update: {},
        create: {
          batchCode: b.batchCode,
          courseId: course.id,
          trainerId: trainer.id,
          totalStudents: b.totalStudents,
          startDate: new Date("2026-01-10"),
          endDate: new Date("2026-06-30"),
        },
      });
      batchesMap[b.batchCode] = batch;
    }
  }
  console.log("✅ Batches created.");

  // 6. Initial Feedback Records (0 items by default)
  const feedbackRecordsData = [];
  console.log("✅ Initial feedback records step completed (empty).");

  // 7. Create Action Items
  const actionItemsData = [
    { actionCode: "ACT-101", title: "Add more practical sessions to MERN Stack", trainerName: "Karthik S", priority: "high", dueDate: "2026-07-20", status: "in_progress", progressPercent: 60, notes: "Coordinating with content team to add 3 new lab sessions." },
    { actionCode: "ACT-102", title: "Improve doubt-response time for Data Science batch", trainerName: "Priya N", priority: "high", dueDate: "2026-07-15", status: "overdue", progressPercent: 30, notes: "Dedicated Slack channel set up, still finalizing SLA." },
    { actionCode: "ACT-103", title: "Publish all UI/UX session recordings", trainerName: "Arjun D", priority: "medium", dueDate: "2026-07-25", status: "open", progressPercent: 0, notes: "" },
    { actionCode: "ACT-104", title: "Pre-provision Cloud Computing lab environments", trainerName: "Meera J", priority: "medium", dueDate: "2026-07-18", status: "in_progress", progressPercent: 75, notes: "Automation script ready, testing on next batch." },
    { actionCode: "ACT-105", title: "Update Python Programming study materials", trainerName: "Priya N", priority: "low", dueDate: "2026-07-30", status: "open", progressPercent: 0, notes: "" },
    { actionCode: "ACT-106", title: "Refresh React examples to latest version", trainerName: "Karthik S", priority: "medium", dueDate: "2026-07-10", status: "completed", progressPercent: 100, notes: "Completed and verified with two batches.", completedAt: "2026-07-09" },
    { actionCode: "ACT-107", title: "Add real-world case studies to Data Science", trainerName: "Priya N", priority: "medium", dueDate: "2026-07-08", status: "completed", progressPercent: 100, notes: "Added 5 new case studies from industry partners.", completedAt: "2026-07-07" },
    { actionCode: "ACT-108", title: "Increase studio/practice time for UI/UX batch", trainerName: "Arjun D", priority: "high", dueDate: "2026-07-12", status: "overdue", progressPercent: 20, notes: "Waiting on studio room availability." },
    { actionCode: "ACT-109", title: "Add advanced track for Cloud Computing learners", trainerName: "Meera J", priority: "low", dueDate: "2026-08-02", status: "open", progressPercent: 0, notes: "" },
    { actionCode: "ACT-110", title: "Set up dedicated doubt-clearing time slot", trainerName: "Priya N", priority: "high", dueDate: "2026-07-05", status: "completed", progressPercent: 100, notes: "New slot added Tue/Thu 5-6pm, well received.", completedAt: "2026-07-04" },
    { actionCode: "ACT-111", title: "Improve lab facilities for MERN Stack batch", trainerName: "Karthik S", priority: "medium", dueDate: "2026-07-22", status: "in_progress", progressPercent: 45, notes: "New systems ordered, installation pending." },
    { actionCode: "ACT-112", title: "Add group project component to MERN course", trainerName: "Karthik S", priority: "low", dueDate: "2026-08-05", status: "open", progressPercent: 0, notes: "" },
  ];

  for (const act of actionItemsData) {
    const trainer = trainersMap[act.trainerName];
    if (trainer) {
      await prisma.actionItem.upsert({
        where: { actionCode: act.actionCode },
        update: {},
        create: {
          actionCode: act.actionCode,
          title: act.title,
          assignedToTrainerId: trainer.id,
          priority: act.priority,
          dueDate: new Date(act.dueDate),
          status: act.status,
          progressPercent: act.progressPercent,
          notes: act.notes,
          completedAt: act.completedAt ? new Date(act.completedAt) : null,
        },
      });
    }
  }
  console.log("✅ Action items created.");

  // 8. Create Initial Notifications
  const initialNotifications = [
    { type: "in_app", message: "New feedback received for DSA course.", recipientLabel: "Karthik S (Trainer)", isRead: false },
    { type: "email", message: "Monthly report for July 2026 is ready.", recipientLabel: "Priya N (Trainer)", isRead: false },
    { type: "alert", message: 'Action "Increase practical sessions" is due tomorrow.', recipientLabel: "Admin", isRead: false },
    { type: "in_app", message: "New feedback collected via QR Code.", recipientLabel: "All Trainers", isRead: true },
    { type: "email", message: "Weekly summary report is available.", recipientLabel: "Management", isRead: true },
    { type: "alert", message: 'Reminder: Action "Improve lab facilities" is pending.', recipientLabel: "Karthik S (Trainer)", isRead: true },
    { type: "email", message: "Trainer report for Akash - July 2026 generated.", recipientLabel: "Akash (Trainer)", isRead: true },
    { type: "in_app", message: "System maintenance scheduled on 20 Jul 2026.", recipientLabel: "All Users", isRead: true },
  ];

  for (const notif of initialNotifications) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: notif.type,
        message: notif.message,
        recipientLabel: notif.recipientLabel,
        isRead: notif.isRead,
      },
    });
  }
  console.log("✅ Notifications created.");

  console.log("🚀 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
