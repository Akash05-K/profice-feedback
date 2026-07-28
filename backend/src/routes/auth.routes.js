import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/auth.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

// Account creation is an administrative action, not public signup. This route
// was previously unauthenticated and defaulted new accounts to super_admin,
// which let anyone mint themselves an administrator.
router.post(
  "/register",
  authenticate,
  requireCapability(CAPABILITIES.MANAGE_USERS),
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("name").notEmpty().withMessage("Name is required"),
    body("role").trim().notEmpty().withMessage("Role is required"),
    validate,
  ],
  authController.register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  authController.login
);

router.get("/me", authenticate, authController.getMe);

export default router;
