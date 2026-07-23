import * as notificationsService from "../services/notifications.service.js";

export const getList = async (req, res, next) => {
  try {
    const result = await notificationsService.getNotifications(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const data = await notificationsService.getNotificationsSummary();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleRead = async (req, res, next) => {
  try {
    const data = await notificationsService.toggleNotificationRead(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const data = await notificationsService.markAllNotificationsAsRead();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const data = await notificationsService.deleteNotification(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await notificationsService.createNotification(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const data = await notificationsService.getNotificationPreferences();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const data = await notificationsService.updateNotificationPreferences(req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
