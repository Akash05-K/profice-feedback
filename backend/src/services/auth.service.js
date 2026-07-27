import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { env } from "../config/env.js";

export const registerUser = async ({ email, password, name, role }) => {
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
      notificationPreferences: {
        create: {
          emailEnabled: true,
          inAppEnabled: true,
          remindersEnabled: true,
          weeklySummaryEnabled: true,
        },
      },
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
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

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

/**
 * Resolve the Trainer data-entity that a logged-in trainer User maps to.
 *
 * The login `User` table and the data-entity `Trainer` table have no FK, so we
 * link them by email (case-insensitive). Used to scope trainers to ONLY their own
 * feedback/insights/chat context. Returns the Trainer id or null (non-trainer, or
 * no matching trainer record).
 */
export const resolveTrainerScope = async (user) => {
  if (!user || user.role !== "trainer") return null;

  let trainer = null;
  if (user.email) {
    trainer = await prisma.trainer.findFirst({
      where: { email: { equals: user.email } },
      select: { id: true, name: true },
    });
  }

  if (!trainer && user.name) {
    const trimmedName = user.name.trim();
    trainer = await prisma.trainer.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName } },
          { name: { contains: trimmedName } },
        ],
      },
      select: { id: true, name: true },
    });
  }

  return trainer ? trainer.id : null;
};
