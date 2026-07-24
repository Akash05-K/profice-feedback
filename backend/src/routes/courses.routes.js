import { Router } from "express";
import * as coursesController from "../controllers/courses.controller.js";

const router = Router();

router.get("/filter-options", coursesController.getFilterOptions);
router.get("/", coursesController.getList);
router.get("/:id/metrics", coursesController.getMetrics);

export default router;
