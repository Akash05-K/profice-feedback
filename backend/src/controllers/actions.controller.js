import * as actionsService from "../services/actions.service.js";

export const getList = async (req, res, next) => {
  try {
    const result = await actionsService.getActions(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const data = await actionsService.getActionStats();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await actionsService.getActionById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await actionsService.createAction(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = await actionsService.updateAction(req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const data = await actionsService.deleteAction(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
