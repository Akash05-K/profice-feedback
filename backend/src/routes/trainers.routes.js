import { Router } from "express";
import * as trainersController from "../controllers/trainers.controller.js";

const router = Router();

router.get("/filter-options", trainersController.getFilterOptions);
router.get("/", trainersController.getList);
router.get("/:id/metrics", trainersController.getMetrics);

export default router;
