import { Router } from "express";
import * as reportsController from "../controllers/reports.controller.js";

const router = Router();

router.get("/", reportsController.getReport);
router.get("/data", reportsController.getReport);

router.get("/export/pdf", reportsController.exportPdf);
router.post("/export/pdf", reportsController.exportPdf);

router.get("/export/excel", reportsController.exportExcel);
router.post("/export/excel", reportsController.exportExcel);

router.get("/export/csv", reportsController.exportCsv);
router.post("/export/csv", reportsController.exportCsv);

export default router;
