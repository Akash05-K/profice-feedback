import { Router } from "express";
import * as reportsController from "../controllers/reports.controller.js";

const router = Router();

router.get("/", reportsController.getReport);
router.post("/export/pdf", reportsController.exportPdf);
router.post("/export/excel", reportsController.exportExcel);
router.post("/export/csv", reportsController.exportCsv);

export default router;
