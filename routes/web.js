import express from "express"
import courseController from "../controllers/web/course.js";
import gamesController from "../controllers/web/game.js";
import { isAuthenticated, isStudent } from "../middlewares/Auth.js";

const router = express.Router();

// Course
router.route('/course/get').get(courseController.get);

// Games
router.route('/game/training-wheel-game/get').get([isAuthenticated, isStudent], gamesController.getTrainingWheelQuestions);


export default router;