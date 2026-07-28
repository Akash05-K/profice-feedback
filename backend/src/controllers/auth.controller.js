import * as authService from "../services/auth.service.js";
import * as usersService from "../services/users.service.js";

// Kept for backwards compatibility with existing clients; the User Management
// page uses POST /api/v1/users. Both go through the same validated path.
export const register = async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};
