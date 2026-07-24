import { Router } from "express";
import * as trainersController from "../controllers/trainers.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

router.use(authenticate);
router.use(
  requireCapability(
    CAPABILITIES.VIEW_INSIGHTS,
    CAPABILITIES.VIEW_OWN_INSIGHTS,
    CAPABILITIES.MANAGE_COURSE_BATCH
  )
);

router.get("/filter-options", trainersController.getFilterOptions);
router.get("/", trainersController.getList);
router.get("/:id/metrics", trainersController.getMetrics);

export default router;
