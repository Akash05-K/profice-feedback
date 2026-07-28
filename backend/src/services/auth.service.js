import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { env } from "../config/env.js";

export const registerUser = async ({ email, password, name, role, program }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error("User with this email already exists.");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: role || "super_admin",
      program: program || null,
      notificationPreferences: {
        create: {
          emailEnabled: true,
          inAppEnabled: true,
          remindersEnabled: true,
          weeklySummaryEnabled: true,
        },
      },
    },
    select: { id: true, email: true, name: true, role: true, program: true, createdAt: true },
  });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, program: user.program }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, program: user.program }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

/**
 * Resolve the Trainer data-entity that a logged-in trainer User maps to.
 */
export const resolveTrainerScope = async (user) => {
  if (!user || user.role !== "trainer") return null;

  const trimmedName = user.name ? user.name.trim() : "";
  const trainers = await prisma.trainer.findMany({
    where: {
      OR: [
        ...(user.email ? [{ email: { equals: user.email } }] : []),
        ...(trimmedName ? [{ name: { equals: trimmedName } }, { name: { contains: trimmedName } }] : []),
      ],
    },
    select: { id: true },
  });

  if (!trainers || trainers.length === 0) return null;
  const ids = trainers.map((t) => t.id);
  return ids.length === 1 ? ids[0] : ids;
};

/**
 * Resolves the full data scope for any logged-in user based on their role and assigned program.
 * - Program Managers: Restricted strictly to trainers & courses in their program (IBM vs Oracle).
 * - Trainers: Restricted strictly to their own trainer record.
 * - Admin/Management: Unrestricted access.
 */
export const resolveUserScope = async (user) => {
  if (!user) {
    return { isUnrestricted: true };
  }

  // 1. Program Manager Data Scope
  if (user.role === "program_manager") {
    let program = user.program;
    if (!program) {
      if (user.email && user.email.toLowerCase().includes("oracle")) {
        program = "Oracle";
      } else {
        program = "IBM";
      }
    }

    const trainers = await prisma.trainer.findMany({
      where: { program },
      select: { id: true, name: true },
    });
    const courses = await prisma.course.findMany({
      where: { program },
      select: { id: true, title: true },
    });

    const trainerIds = trainers.map((t) => t.id);
    const courseIds = courses.map((c) => c.id);
    const trainerNames = trainers.map((t) => t.name);
    const courseTitles = courses.map((c) => c.title);

    return {
      isProgramManager: true,
      program,
      trainerIds,
      courseIds,
      trainerNames,
      courseTitles,
      trainerWhere: { id: { in: trainerIds } },
      courseWhere: { id: { in: courseIds } },
      feedbackWhere: {
        OR: [
          { trainerId: { in: trainerIds } },
          { courseId: { in: courseIds } },
          { trainer: { program } },
          { course: { program } },
        ],
      },
    };
  }

  // 2. Trainer Data Scope
  if (user.role === "trainer") {
    const scopeTrainerId = await resolveTrainerScope(user);
    const trainerIdList = Array.isArray(scopeTrainerId) ? scopeTrainerId : (scopeTrainerId ? [scopeTrainerId] : []);
    
    // Find courses taught by trainer in batches
    const batches = await prisma.batch.findMany({
      where: { trainerId: { in: trainerIdList } },
      select: { courseId: true },
    });
    const courseIds = [...new Set(batches.map((b) => b.courseId))];

    return {
      isTrainer: true,
      trainerId: scopeTrainerId,
      trainerIds: trainerIdList,
      courseIds,
      trainerWhere: { id: scopeTrainerId ? (Array.isArray(scopeTrainerId) ? { in: scopeTrainerId } : scopeTrainerId) : -1 },
      courseWhere: courseIds.length > 0 ? { id: { in: courseIds } } : {},
      feedbackWhere: { trainerId: scopeTrainerId ? (Array.isArray(scopeTrainerId) ? { in: scopeTrainerId } : scopeTrainerId) : -1 },
    };
  }

  // 3. Admin / Management (Unrestricted)
  return { isUnrestricted: true };
};
