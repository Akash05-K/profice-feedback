import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { env } from "../config/env.js";

// Account creation lives in services/users.service.js so it goes through one
// validated path (role/program checks + trainer provisioning). The old
// registerUser() here defaulted new accounts to super_admin and is gone.

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
 * - Super Admin / ACE Lead / Management: Unrestricted (Management is read-only
 *   via capabilities, not via scope).
 *
 * Consumers should not read the raw ids directly — pass the returned scope to
 * the helpers in utils/scope.js so every query is filtered the same way.
 */
export const resolveUserScope = async (user) => {
  if (!user) {
    return { isUnrestricted: true };
  }

  // 1. Program Manager Data Scope
  if (user.role === "program_manager") {
    // No program assigned means no data. Previously this guessed the program
    // from the email address and defaulted to IBM, which silently handed a
    // misconfigured manager another team's records.
    const program = user.program || null;

    const [trainers, courses] = program
      ? await Promise.all([
          prisma.trainer.findMany({ where: { program }, select: { id: true, name: true } }),
          prisma.course.findMany({ where: { program }, select: { id: true, title: true } }),
        ])
      : [[], []];

    const trainerIds = trainers.map((t) => t.id);
    const courseIds = courses.map((c) => c.id);

    return {
      isProgramManager: true,
      program,
      hasProgram: Boolean(program),
      trainerIds,
      courseIds,
      trainerNames: trainers.map((t) => t.name),
      courseTitles: courses.map((c) => c.title),
    };
  }

  // 2. Trainer Data Scope
  if (user.role === "trainer") {
    const scopeTrainerId = await resolveTrainerScope(user);
    const trainerIds = Array.isArray(scopeTrainerId)
      ? scopeTrainerId
      : scopeTrainerId
      ? [scopeTrainerId]
      : [];

    // Courses this trainer actually teaches, via their batches.
    const batches = await prisma.batch.findMany({
      where: { trainerId: { in: trainerIds } },
      select: { courseId: true },
    });
    const courseIds = [...new Set(batches.map((b) => b.courseId))];

    return {
      isTrainer: true,
      program: user.program || null,
      trainerId: scopeTrainerId,
      trainerIds,
      courseIds,
    };
  }

  // 3. Super Admin / ACE Lead / Management (unrestricted data access)
  return { isUnrestricted: true };
};
