import * as reportsService from "../services/reports.service.js";
import { resolveUserScope } from "../services/auth.service.js";

export const getReport = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await reportsService.getReportsData(req.query, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const exportPdf = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const { buffer, filename, contentType } = await reportsService.exportReportsPdf(req.query, userScope);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

export const exportExcel = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const { buffer, filename, contentType } = await reportsService.exportReportsExcel(req.query, userScope);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

export const exportCsv = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const { buffer, filename, contentType } = await reportsService.exportReportsCsv(req.query, userScope);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};
