import express from "express"
import courseController from "../controllers/teacher/course.js";
import teacherController from "../controllers/teacher/teacher.js";
import gamesController from "../controllers/teacher/games.js";
import courseCategoryController from "../controllers/teacher/coursecategory.js";
import gameCategoryController from "../controllers/teacher/gamecategory.js";
import dashboardController from "../controllers/teacher/dashboard.js";

import { isAuthenticated, isTeacher  } from "../middlewares/Auth.js";

const router = express.Router();

// Auth
router.route('/register').post(teacherController.register);
router.route('/login').post(teacherController.login);
router.route('/verifyTwoFactor').post(teacherController.verifyTwoFactor);
router.route('/verifyUser').put(teacherController.verifyUser);
router.route('/generateOTP').put(teacherController.generateOTP);
router.route('/verifyOTP').put(teacherController.verifyOTP);
router.route('/forgotPassword').post(teacherController.forgotPassword);
router.route('/resetPassword/:id/:token').post(teacherController.resetPassword);
router.route('/updateProfile').put([isAuthenticated, isTeacher], teacherController.updateProfile);
router.route('/updatePassword').put([isAuthenticated, isTeacher], teacherController.updatePassword);

// Courses
router.route('/course/create').post([isAuthenticated, isTeacher],courseController.create);
router.route('/course/edit/:id').put([isAuthenticated, isTeacher],courseController.edit);
router.route('/course/delete/:id').delete([isAuthenticated, isTeacher],courseController.delete);
router.route('/course/get').get([isAuthenticated, isTeacher],courseController.get);
router.route('/course/getCourse/:id').get([isAuthenticated, isTeacher],courseController.getCourse);
router.route('/course/get-course-students').get([isAuthenticated, isTeacher],courseController.getCourseStudents);

// Dashboard
router.route('/dashboard/cards').get([isAuthenticated, isTeacher], dashboardController.getCards);
router.route('/dashboard/courses-by-students').get([isAuthenticated, isTeacher], dashboardController.coursesByStudents);
router.route('/dashboard/monthly-enrolled-students').get([isAuthenticated, isTeacher], dashboardController.monthlyEnrolledStudents);

// Games
router.route('/game/training-wheel-game/create').post([isAuthenticated, isTeacher], gamesController.createTrainingWheelGame);
router.route('/game/training-wheel-game/get').get([isAuthenticated, isTeacher], gamesController.getTrainingWheelQuestions);
router.route('/game/training-wheel-game/delete/:id').delete([isAuthenticated, isTeacher], gamesController.deleteTWQuestion);
router.route('/game/training-wheel-game/get-game/:id').get([isAuthenticated, isTeacher], gamesController.getTWGame);
router.route('/game/training-wheel-game/update/:id').put([isAuthenticated, isTeacher], gamesController.updateTrainingWheelGame);


// Course Category
router.route('/course-category/getAll').get([isAuthenticated, isTeacher], courseCategoryController.getAll);

// Game Category
router.route('/game-category/getAll').get([isAuthenticated, isTeacher], gameCategoryController.getAll);


// DISCARDED
// router.route('/course/getMyCourses/:page?').get([isAuthenticated, isTeacher],courseController.getMyCourses);
// router.route('/course/search/:page?').get([isAuthenticated, isTeacher],courseController.search);


export default router;