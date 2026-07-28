import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { ASSIGNABLE_ROLES, PROGRAM_SCOPED_ROLES, ROLE_LABELS } from "../config/permissions.js";

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  program: true,
  createdAt: true,
};

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  throw error;
};

const normaliseEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * A trainer login is only useful if a matching Trainer entity exists —
 * `resolveTrainerScope()` links the two by email, and without it the account
 * signs in to an empty app. Program-scoped roles must also carry a program.
 */
const validateRoleShape = ({ role, program }) => {
  if (!ASSIGNABLE_ROLES.includes(role)) {
    badRequest(`Unknown role "${role}". Choose one of: ${ASSIGNABLE_ROLES.join(", ")}.`);
  }
  if (PROGRAM_SCOPED_ROLES.includes(role) && !String(program || "").trim()) {
    badRequest(`A program is required for the ${ROLE_LABELS[role]} role.`);
  }
};

/** Distinct programs already in use, so the UI can offer them as choices. */
export const getUserMeta = async () => {
  const [trainerPrograms, coursePrograms, colleges] = await Promise.all([
    prisma.trainer.findMany({ where: { program: { not: null } }, select: { program: true }, distinct: ["program"] }),
    prisma.course.findMany({ where: { program: { not: null } }, select: { program: true }, distinct: ["program"] }),
    prisma.college.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const programs = [
    ...new Set([...trainerPrograms, ...coursePrograms].map((p) => p.program).filter(Boolean)),
  ].sort();

  return {
    roles: ASSIGNABLE_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] })),
    programScopedRoles: PROGRAM_SCOPED_ROLES,
    programs,
    colleges,
  };
};

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    select: PUBLIC_FIELDS,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  // Surface whether a trainer login is actually wired to a Trainer entity, so
  // an admin can see at a glance which accounts would open to an empty app.
  const trainers = await prisma.trainer.findMany({
    select: { id: true, name: true, email: true, program: true },
  });
  const trainerByEmail = new Map(
    trainers.filter((t) => t.email).map((t) => [t.email.toLowerCase(), t])
  );

  return users.map((u) => {
    const linked = u.role === "trainer" ? trainerByEmail.get(u.email.toLowerCase()) || null : null;
    return {
      ...u,
      roleLabel: ROLE_LABELS[u.role] || u.role,
      createdAt: u.createdAt.toISOString().slice(0, 10),
      trainerId: linked ? linked.id : null,
      isLinked: u.role !== "trainer" || Boolean(linked),
    };
  });
};

export const createUser = async ({ email, password, name, role, program, collegeId, specialties }) => {
  const cleanEmail = normaliseEmail(email);
  const cleanName = String(name || "").trim();

  if (!cleanEmail) badRequest("An email address is required.");
  if (!cleanName) badRequest("A name is required.");
  if (!password || String(password).length < 6) {
    badRequest("Password must be at least 6 characters.");
  }

  validateRoleShape({ role, program });

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) badRequest("A user with this email already exists.");

  const passwordHash = await bcrypt.hash(String(password), 10);
  const cleanProgram = PROGRAM_SCOPED_ROLES.includes(role) ? String(program).trim() : null;

  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      name: cleanName,
      passwordHash,
      role,
      program: cleanProgram,
      notificationPreferences: {
        create: {
          emailEnabled: true,
          inAppEnabled: true,
          remindersEnabled: true,
          weeklySummaryEnabled: true,
        },
      },
    },
    select: PUBLIC_FIELDS,
  });

  // Provision the matching Trainer entity so the new login has data scope from
  // the very first sign-in.
  if (role === "trainer") {
    await provisionTrainerEntity({ user, program: cleanProgram, collegeId, specialties });
  }

  return user;
};

const provisionTrainerEntity = async ({ user, program, collegeId, specialties }) => {
  const existingTrainer = await prisma.trainer.findUnique({ where: { email: user.email } });
  if (existingTrainer) {
    // Keep an already-present trainer row aligned with the new login.
    await prisma.trainer.update({
      where: { id: existingTrainer.id },
      data: { name: user.name, program },
    });
    return existingTrainer;
  }

  let resolvedCollegeId = Number(collegeId);
  if (!resolvedCollegeId || isNaN(resolvedCollegeId)) {
    const fallback = await prisma.college.findFirst({ orderBy: { id: "asc" } });
    if (!fallback) badRequest("No college exists yet — add a college before creating trainer accounts.");
    resolvedCollegeId = fallback.id;
  } else {
    const college = await prisma.college.findUnique({ where: { id: resolvedCollegeId } });
    if (!college) badRequest("The selected college does not exist.");
  }

  const specialtyList = Array.isArray(specialties)
    ? specialties.filter(Boolean)
    : String(specialties || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return prisma.trainer.create({
    data: {
      name: user.name,
      email: user.email,
      program,
      collegeId: resolvedCollegeId,
      subjectSpecialties: JSON.stringify(
        specialtyList.length > 0 ? specialtyList : ["General Instruction"]
      ),
    },
  });
};

export const updateUser = async (id, { name, role, program }, actingUser) => {
  const userId = Number(id);
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) notFound("User not found.");

  const nextRole = role || existing.role;
  const nextProgram = program !== undefined ? program : existing.program;
  validateRoleShape({ role: nextRole, program: nextProgram });

  // Don't let an admin demote themselves out of user management and lock
  // everyone out of the page.
  if (actingUser && existing.id === actingUser.id && nextRole !== existing.role) {
    badRequest("You cannot change your own role.");
  }

  await guardLastSuperAdmin(existing, nextRole);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name !== undefined ? String(name).trim() : existing.name,
      role: nextRole,
      program: PROGRAM_SCOPED_ROLES.includes(nextRole) ? String(nextProgram).trim() : null,
    },
    select: PUBLIC_FIELDS,
  });

  // Keep the linked Trainer entity in step with the login it belongs to.
  if (updated.role === "trainer") {
    await prisma.trainer
      .updateMany({
        where: { email: updated.email },
        data: { name: updated.name, program: updated.program },
      })
      .catch(() => {});
  }

  return updated;
};

export const resetUserPassword = async (id, password) => {
  if (!password || String(password).length < 6) {
    badRequest("Password must be at least 6 characters.");
  }

  const userId = Number(id);
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) notFound("User not found.");

  const passwordHash = await bcrypt.hash(String(password), 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { id: userId, email: existing.email, passwordReset: true };
};

export const deleteUser = async (id, actingUser) => {
  const userId = Number(id);
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) notFound("User not found.");

  if (actingUser && existing.id === actingUser.id) {
    badRequest("You cannot delete your own account.");
  }

  await guardLastSuperAdmin(existing, null);

  // The Trainer entity is deliberately left behind. Its feedback records
  // cascade-delete with it, so removing a login must not erase the history that
  // dashboards and reports are built from.
  const linkedTrainer =
    existing.role === "trainer"
      ? await prisma.trainer.findUnique({ where: { email: existing.email }, select: { id: true } })
      : null;

  await prisma.user.delete({ where: { id: userId } });

  return {
    id: userId,
    email: existing.email,
    deleted: true,
    trainerProfileRetained: Boolean(linkedTrainer),
  };
};

/**
 * Refuse any change that would leave the system with no super admin — deleting
 * or demoting the last one would make user management unreachable forever.
 */
const guardLastSuperAdmin = async (existing, nextRole) => {
  if (existing.role !== "super_admin" || nextRole === "super_admin") return;

  const superAdmins = await prisma.user.count({ where: { role: "super_admin" } });
  if (superAdmins <= 1) {
    badRequest("This is the last Super Admin account — promote another user first.");
  }
};
