import * as feedbackService from "../services/feedback.service.js";

export const getList = async (req, res, next) => {
  try {
    const result = await feedbackService.getFeedbackRecords(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const data = await feedbackService.getFeedbackStats();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFilterOptions = async (req, res, next) => {
  try {
    const data = await feedbackService.getFeedbackFilterOptions(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await feedbackService.getFeedbackById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const data = await feedbackService.toggleFeedbackStatus(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const data = await feedbackService.deleteFeedbackRecord(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const bulkAction = async (req, res, next) => {
  try {
    const data = await feedbackService.bulkActionFeedback(req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const exportRecords = async (req, res, next) => {
  try {
    const { buffer, filename, contentType } = await feedbackService.exportFeedbackRecords(req.body);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};
