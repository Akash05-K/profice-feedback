import * as dashboardService from "../services/dashboard.service.js";

export const getStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardStats();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTrends = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardTrends();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSentiment = async (req, res, next) => {
  try {
    const data = await dashboardService.getSentimentDistribution();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTopics = async (req, res, next) => {
  try {
    const data = await dashboardService.getTopTopics();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getRecent = async (req, res, next) => {
  try {
    const data = await dashboardService.getRecentFeedback();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
