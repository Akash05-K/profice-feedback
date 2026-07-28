import * as usersService from "../services/users.service.js";

export const getMeta = async (req, res, next) => {
  try {
    const data = await usersService.getUserMeta();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getList = async (req, res, next) => {
  try {
    const data = await usersService.getUsers();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await usersService.createUser(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = await usersService.updateUser(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const data = await usersService.resetUserPassword(req.params.id, req.body.password);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const data = await usersService.deleteUser(req.params.id, req.user);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
