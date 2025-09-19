import jwt from "jsonwebtoken";
import ErrorHandler from "../utils/functions/ErrorHandler.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import Admin from "../models/admin.js";

const SECRET_KEY = process.env.SECRET_KEY;

const isAuthenticated = async (req, res, next) => {
  const tokenHeader = req.header("Authorization");
  if (!tokenHeader) {
    console.log('tokenHeader ===>',tokenHeader)
    return ErrorHandler("Unauthorized: Token not provided", 401, res);
  }

  const [tokenType, token] = tokenHeader.split(" ");

  if (tokenType !== "Bearer" || !token) {
    return ErrorHandler("Unauthorized: Invalid token format", 401, res);
  }
  try {

    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.userType === "admin") {
      req.user = await Admin.findById(decoded.id);
      req.user.userType = "admin";
    }
    if (decoded.userType === "student") {
      req.user = await Student.findById(decoded.id);
      req.user.userType = "student";
    };
    if (decoded.userType === "teacher") {
      req.user = await Teacher.findById(decoded.id);
      req.user.userType = "teacher";
    }
    next();
  } catch (error) {
    return ErrorHandler("Forbidden: Invalid token", 403, res);
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.userType === "admin") {
    next();
  } else {
    return ErrorHandler("Unauthorized: User is not admin!", 401, res);
  }
};

const isTeacher = (req, res, next) => {
  if (req.user.userType === "teacher") {
    next();
  } else {
    return ErrorHandler("Unauthorized: User is not teacher!", 401, res);
  }
};

const isStudent = (req, res, next) => {
  if (req.user.userType === "student") {
    next();
  } else {
    return ErrorHandler("Unauthorized: User is not student!", 401, res);
  }
};

export { isAuthenticated, isAdmin, isTeacher, isStudent };