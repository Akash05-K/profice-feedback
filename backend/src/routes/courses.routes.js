import { Router } from "express";
import * as coursesController from "../controllers/courses.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

router.use(authenticate);
router.use(requireCapability(CAPABILITIES.VIEW_INSIGHTS, CAPABILITIES.MANAGE_COURSE_BATCH));

router.get("/filter-options", coursesController.getFilterOptions);
router.get("/", coursesController.getList);
router.get("/:id/metrics", coursesController.getMetrics);

export default router;
