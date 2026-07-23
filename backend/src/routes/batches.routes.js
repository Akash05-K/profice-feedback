import { Router } from "express";
import * as batchesController from "../controllers/batches.controller.js";

const router = Router();

router.get("/", batchesController.getList);
router.get("/stats", batchesController.getStats);

export default router;
