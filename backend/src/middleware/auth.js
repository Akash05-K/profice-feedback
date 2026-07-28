import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import prisma from "../config/db.js";
import { roleHasAnyCapability } from "../config/permissions.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication token required." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, program: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

/**
 * Capability-based guard. Passes if the authenticated user's role has ANY of the
 * given capabilities. Reads clearer than raw role lists and stays in sync with the
 * RBAC map in config/permissions.js.
 */
export const requireCapability = (...capabilities) => {
  return (req, res, next) => {
    if (!req.user || !roleHasAnyCapability(req.user.role, capabilities)) {
      return res.status(403).json({ success: false, message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};
