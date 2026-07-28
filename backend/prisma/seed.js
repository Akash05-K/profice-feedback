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

  // 1b. Demo users for RBAC roles including Program Managers
  const demoUsers = [
    { email: "management@profice.edu", name: "Maya Management", role: "management", password: "manage123", program: null },
    { email: "ibm_pm@profice.edu", name: "IBM Program Manager", role: "program_manager", password: "pm123", program: "IBM" },
    { email: "oracle_pm@profice.edu", name: "Oracle Program Manager", role: "program_manager", password: "pm123", program: "Oracle" },
    { email: "pm@profice.edu", name: "Pavan Program-Manager", role: "program_manager", password: "pm123", program: "IBM" },
    { email: "acelead@profice.edu", name: "Asha ACE-Lead", role: "ace_lead", password: "ace123", program: null },
    
    // IBM Trainers
    { email: "harish@profice.edu", name: "Harish", role: "trainer", password: "trainer123", program: "IBM" },
    { email: "akash@profice.edu", name: "Akash", role: "trainer", password: "trainer123", program: "IBM" },
    { email: "harsha@profice.edu", name: "Harsha", role: "trainer", password: "trainer123", program: "IBM" },
    { email: "theesthan@profice.edu", name: "Theesthan", role: "trainer", password: "trainer123", program: "IBM" },
    { email: "lokesh@profice.edu", name: "Lokesh", role: "trainer", password: "trainer123", program: "IBM" },

    // Oracle Trainers
    { email: "anandr@profice.edu", name: "Anand R", role: "trainer", password: "trainer123", program: "Oracle" },
    { email: "arunp@profice.edu", name: "Arun P", role: "trainer", password: "trainer123", program: "Oracle" },
    { email: "divyas@profice.edu", name: "Divya S", role: "trainer", password: "trainer123", program: "Oracle" },
    { email: "keerthanar@profice.edu", name: "Keerthana R", role: "trainer", password: "trainer123", program: "Oracle" },
    { email: "nivetham@profice.edu", name: "Nivetha M", role: "trainer", password: "trainer123", program: "Oracle" },
  ];

  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, passwordHash: hash, program: u.program },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: hash,
        role: u.role,
        program: u.program,
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
    console.log(`✅ User ${u.email} (${u.role}${u.program ? " - " + u.program : ""}) ready`);
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

  // 3. Create Trainers (IBM & Oracle)
  const trainersData = [
    // IBM Trainers
    { name: "Akash", email: "akash@profice.edu", collegeId: psg.id, program: "IBM", specialties: ["AI & ML", "Data Analytics"] },
    { name: "Harsha", email: "harsha@profice.edu", collegeId: cit.id, program: "IBM", specialties: ["Python Full Stack", "DAA"] },
    { name: "Theesthan", email: "theesthan@profice.edu", collegeId: cit.id, program: "IBM", specialties: ["Cloud Computing", "AI & ML"] },
    { name: "Lokesh", email: "lokesh@profice.edu", collegeId: gct.id, program: "IBM", specialties: ["Data Analytics", "Python Full Stack"] },
    { name: "Harish", email: "harish@profice.edu", collegeId: psg.id, program: "IBM", specialties: ["Cloud Computing", "DAA"] },

    // Oracle Trainers
    { name: "Anand R", email: "anandr@profice.edu", collegeId: psg.id, program: "Oracle", specialties: ["Java Full Stack", "DevOps Engineering"] },
    { name: "Arun P", email: "arunp@profice.edu", collegeId: cit.id, program: "Oracle", specialties: ["Blockchain", "Business Analytics"] },
    { name: "Divya S", email: "divyas@profice.edu", collegeId: cit.id, program: "Oracle", specialties: ["UI/UX Design", "Java Full Stack"] },
    { name: "Keerthana R", email: "keerthanar@profice.edu", collegeId: gct.id, program: "Oracle", specialties: ["Business Analytics", "Blockchain"] },
    { name: "Nivetha M", email: "nivetham@profice.edu", collegeId: gct.id, program: "Oracle", specialties: ["DevOps Engineering", "UI/UX Design"] },
  ];

  const trainersMap = {};
  for (const t of trainersData) {
    const trainer = await prisma.trainer.upsert({
      where: { email: t.email },
      update: { name: t.name, collegeId: t.collegeId, program: t.program, subjectSpecialties: JSON.stringify(t.specialties) },
      create: {
        name: t.name,
        email: t.email,
        collegeId: t.collegeId,
        program: t.program,
        subjectSpecialties: JSON.stringify(t.specialties),
      },
    });
    trainersMap[t.name] = trainer;
  }
  console.log("✅ Trainers created for IBM and Oracle.");

  // 4. Create Courses (IBM & Oracle)
  const coursesData = [
    // IBM Courses
    { title: "AI & ML", category: "Artificial Intelligence", durationWeeks: 16, collegeId: psg.id, program: "IBM" },
    { title: "Cloud Computing", category: "Cloud & DevOps", durationWeeks: 14, collegeId: cit.id, program: "IBM" },
    { title: "Data Analytics", category: "Data & Analytics", durationWeeks: 12, collegeId: psg.id, program: "IBM" },
    { title: "Python Full Stack", category: "Web Development", durationWeeks: 16, collegeId: gct.id, program: "IBM" },
    { title: "DAA", category: "Computer Science", durationWeeks: 10, collegeId: cit.id, program: "IBM" },

    // Oracle Courses
    { title: "Java Full Stack", category: "Web Development", durationWeeks: 16, collegeId: psg.id, program: "Oracle" },
    { title: "Blockchain", category: "Emerging Tech", durationWeeks: 12, collegeId: cit.id, program: "Oracle" },
    { title: "UI/UX Design", category: "Design", durationWeeks: 10, collegeId: cit.id, program: "Oracle" },
    { title: "Business Analytics", category: "Analytics", durationWeeks: 14, collegeId: gct.id, program: "Oracle" },
    { title: "DevOps Engineering", category: "Cloud & DevOps", durationWeeks: 16, collegeId: gct.id, program: "Oracle" },
  ];

  const coursesMap = {};
  for (const c of coursesData) {
    let course = await prisma.course.findFirst({ where: { title: c.title, collegeId: c.collegeId, program: c.program } });
    if (!course) {
      course = await prisma.course.create({
        data: c,
      });
    }
    coursesMap[`${c.program}_${c.title}`] = course;
    coursesMap[c.title] = course;
  }
  console.log("✅ Courses created for IBM and Oracle.");

  // 5. Create Batches
  const batchesData = [
    // IBM Batches
    { batchCode: "IBM-AIML-01", courseTitle: "AI & ML", trainerName: "Akash", totalStudents: 35 },
    { batchCode: "IBM-CLOUD-01", courseTitle: "Cloud Computing", trainerName: "Theesthan", totalStudents: 30 },
    { batchCode: "IBM-DA-01", courseTitle: "Data Analytics", trainerName: "Akash", totalStudents: 28 },
    { batchCode: "IBM-PY-01", courseTitle: "Python Full Stack", trainerName: "Harsha", totalStudents: 40 },
    { batchCode: "IBM-DAA-01", courseTitle: "DAA", trainerName: "Harish", totalStudents: 32 },

    // Oracle Batches
    { batchCode: "ORC-JAVA-01", courseTitle: "Java Full Stack", trainerName: "Anand R", totalStudents: 38 },
    { batchCode: "ORC-BC-01", courseTitle: "Blockchain", trainerName: "Arun P", totalStudents: 25 },
    { batchCode: "ORC-UIUX-01", courseTitle: "UI/UX Design", trainerName: "Divya S", totalStudents: 30 },
    { batchCode: "ORC-BA-01", courseTitle: "Business Analytics", trainerName: "Keerthana R", totalStudents: 27 },
    { batchCode: "ORC-DEVOPS-01", courseTitle: "DevOps Engineering", trainerName: "Nivetha M", totalStudents: 33 },
  ];

  const batchesMap = {};
  for (const b of batchesData) {
    const course = coursesMap[b.courseTitle];
    const trainer = trainersMap[b.trainerName];
    if (course && trainer) {
      const batch = await prisma.batch.upsert({
        where: { batchCode: b.batchCode },
        update: { courseId: course.id, trainerId: trainer.id },
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

  // 6. Create Action Items
  const actionItemsData = [
    // IBM Actions
    { actionCode: "ACT-IBM-101", title: "Add hands-on Neural Network labs to AI & ML", trainerName: "Akash", priority: "high", dueDate: "2026-08-15", status: "in_progress", progressPercent: 60, notes: "Setting up Jupyter environments." },
    { actionCode: "ACT-IBM-102", title: "Pre-provision AWS lab accounts for Cloud Computing", trainerName: "Theesthan", priority: "high", dueDate: "2026-08-10", status: "open", progressPercent: 20, notes: "Waiting for cloud budget approval." },
    { actionCode: "ACT-IBM-103", title: "Conduct extra doubt sessions for Python Full Stack", trainerName: "Harsha", priority: "medium", dueDate: "2026-08-05", status: "completed", progressPercent: 100, notes: "2 sessions held successfully.", completedAt: "2026-08-04" },
    { actionCode: "ACT-IBM-104", title: "Include SQL Optimization in Data Analytics module", trainerName: "Lokesh", priority: "medium", dueDate: "2026-08-20", status: "in_progress", progressPercent: 40, notes: "Drafting syllabus update." },
    { actionCode: "ACT-IBM-105", title: "Prepare practice question bank for DAA", trainerName: "Harish", priority: "low", dueDate: "2026-08-25", status: "open", progressPercent: 0, notes: "" },

    // Oracle Actions
    { actionCode: "ACT-ORC-201", title: "Upgrade Spring Boot examples to v3.2 in Java Full Stack", trainerName: "Anand R", priority: "high", dueDate: "2026-08-12", status: "in_progress", progressPercent: 75, notes: "Code samples updated, testing build scripts." },
    { actionCode: "ACT-ORC-202", title: "Add Smart Contract deployment lab in Blockchain", trainerName: "Arun P", priority: "high", dueDate: "2026-08-18", status: "open", progressPercent: 10, notes: "Integrating Remix IDE instructions." },
    { actionCode: "ACT-ORC-203", title: "Publish Figma design system templates for UI/UX", trainerName: "Divya S", priority: "medium", dueDate: "2026-08-08", status: "completed", progressPercent: 100, notes: "Shared via community link.", completedAt: "2026-08-07" },
    { actionCode: "ACT-ORC-204", title: "Add PowerBI dashboard project for Business Analytics", trainerName: "Keerthana R", priority: "medium", dueDate: "2026-08-22", status: "in_progress", progressPercent: 50, notes: "Data set selected." },
    { actionCode: "ACT-ORC-205", title: "Setup Kubernetes cluster lab for DevOps Engineering", trainerName: "Nivetha M", priority: "high", dueDate: "2026-08-14", status: "open", progressPercent: 30, notes: "Configuring Minikube." },
  ];

  for (const act of actionItemsData) {
    const trainer = trainersMap[act.trainerName];
    if (trainer) {
      await prisma.actionItem.upsert({
        where: { actionCode: act.actionCode },
        update: { assignedToTrainerId: trainer.id, status: act.status, progressPercent: act.progressPercent },
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
  console.log("✅ Action items created for IBM and Oracle.");

  // 7. Clear all feedback records and upload sessions so Program Managers start clean
  await prisma.feedbackRecord.deleteMany({});
  await prisma.uploadSession.deleteMany({});
  console.log("✅ Seed feedback records cleared (empty by default).");

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
