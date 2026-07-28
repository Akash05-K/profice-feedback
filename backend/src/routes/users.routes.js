import { Router } from "express";
import { body } from "express-validator";
import * as usersController from "../controllers/users.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

// User management is reserved for Super Admin and ACE Lead.
router.use(authenticate);
router.use(requireCapability(CAPABILITIES.MANAGE_USERS));

const createRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("role").trim().notEmpty().withMessage("Role is required"),
  validate,
];

const passwordRules = [
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  validate,
];

router.get("/meta", usersController.getMeta);
router.get("/", usersController.getList);
router.post("/", createRules, usersController.create);
router.put("/:id", usersController.update);
router.patch("/:id/password", passwordRules, usersController.resetPassword);
router.delete("/:id", usersController.remove);

export default router;
