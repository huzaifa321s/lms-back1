import express from "express"
import courseController from "../controllers/web/course.js";
import gamesController from "../controllers/web/game.js";
import { isAuthenticated, isStudent } from "../middlewares/Auth.js";
import blogControllerWeb from "../controllers/web/blog.js";
import jwt from 'jsonwebtoken';
  
const router = express.Router();
const optionalAuth = (req, res, next) => {
    const token = req.cookies?.studentToken || req.headers["authorization"]?.split(" ")[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        req.user = null;
        next();
    }
};
// Course
router.route('/course/get').get(courseController.get);
router.route('/course/getCourse').get(optionalAuth, courseController.getCourse);
router.route('/blog/get').get(blogControllerWeb.get);
router.route('/blog/getBlog/:id').get(blogControllerWeb.getBlog);
router.route('/courses/landing').get(courseController.getLandingCourses);
router.route('/blogs/landing').get(blogControllerWeb.getLandingBlog);

// Games
router.route('/game/training-wheel-game/get').get([isAuthenticated, isStudent], gamesController.getTrainingWheelQuestions);


export default router;