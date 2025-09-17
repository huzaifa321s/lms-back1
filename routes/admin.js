import express from "express"
import adminController from "../controllers/admin/admin.js";
import dashboardController from "../controllers/admin/dashboard.js";
import blogController from "../controllers/admin/blog.js";
import blogCategoryController from "../controllers/admin/blogcategory.js";
import courseCategoryController from "../controllers/admin/coursecategory.js";

// import cityController from "../controllers/admin/city.js";
// import stateController from "../controllers/admin/state.js";
// import courseCategoryController from "../controllers/coursecategory.js";
import { isAuthenticated, isAdmin } from "../middlewares/Auth.js";
import studentController from "../controllers/admin/student.js";
import teacherController from "../controllers/admin/teacher.js";
import courseController from "../controllers/admin/course.js";
import gamesController from "../controllers/admin/game.js";
import gameCategoryController from "../controllers/admin/gamecategory.js";


const router = express.Router();

// Admin routes
router.route('/register').post(adminController.register);
router.route('/login').post(adminController.login);
router.route('/verifyTwoFactor').post(adminController.verifyTwoFactor);
router.route('/verifyForgotPasswordOTP').post(adminController.verifyForgotPasswordOTP);
router.route('/forgotPassword').post(adminController.forgotPassword);
router.route('/resetPassword/:id/:token').post(adminController.resetPassword);

// Dashboard
router.route('/dashboard/cards').get([isAuthenticated, isAdmin], dashboardController.getCards);
router.route('/dashboard/top-courses').get([isAuthenticated, isAdmin], dashboardController.getTopCourses);
router.route('/dashboard/earnings').get([isAuthenticated, isAdmin], dashboardController.getEarnings);
router.route('/dashboard/top-teachers').get([isAuthenticated, isAdmin], dashboardController.getTopTeachers);
router.route('/dashboard/registered-last-week').get([isAuthenticated, isAdmin], dashboardController.getRegistrationsLastWeek);

// Blogs
router.route('/blog/get').get([isAuthenticated, isAdmin], blogController.get);
router.route('/blog/add').post([isAuthenticated, isAdmin], blogController.add);
router.route('/blog/getBlog/:id').get([isAuthenticated, isAdmin], blogController.getBlog);
router.route('/blog/delete/:id').delete([isAuthenticated, isAdmin], blogController.delete);
router.route('/blog/edit/:id').put([isAuthenticated, isAdmin], blogController.edit);

// Blogs category
router.route('/blog-category/add').post([isAuthenticated, isAdmin], blogCategoryController.add);
router.route('/blog-category/get').get([isAuthenticated, isAdmin], blogCategoryController.get);
router.route('/blog-category/getCategory/:id').get([isAuthenticated,isAdmin],blogCategoryController.getCategory)
router.route('/blog-category/getAll').get([isAuthenticated, isAdmin], blogCategoryController.getAll);
router.route('/blog-category/edit/:id').put([isAuthenticated, isAdmin], blogCategoryController.edit);
router.route('/blog-category/delete/:id').delete([isAuthenticated, isAdmin], blogCategoryController.delete);

// Student
router.route('/student/get').get([isAuthenticated, isAdmin], studentController.get)
router.route('/student/getStudent/:id').get([isAuthenticated, isAdmin], studentController.getStudent)
router.route('/student/get-students-status').get([isAuthenticated, isAdmin], studentController.getStudentsStatus)
router.route('/student/getStudentWithEnrolledCourses/:id').get([isAuthenticated, isAdmin], studentController.getStudentWithEnrolledCourses)
router.route('/student/get-enrolled-courses').get([isAuthenticated, isAdmin], studentController.getEnrolledCourses);

// Teacher
router.route('/teacher/get').get([isAuthenticated, isAdmin], teacherController.get)
router.route('/teacher/get-teachers-status').get([isAuthenticated, isAdmin], teacherController.getTeachersStatus)
router.route('/teacher/getTeacher/:id').get([isAuthenticated, isAdmin], teacherController.getTeacher)

// Courses
router.route('/course/get').get([isAuthenticated, isAdmin], courseController.get);
router.route('/course/getCourse/:id').get([isAuthenticated, isAdmin], courseController.getCourse);
router.route('/course/get-courses-status').get([isAuthenticated, isAdmin], courseController.getCoursesStatus);
router.route('/course/edit/:id').put([isAuthenticated, isAdmin],courseController.edit);
router.route('/course/delete/:id').delete([isAuthenticated, isAdmin],courseController.delete);

// Course category
router.route('/course-category/add').post([isAuthenticated, isAdmin], courseCategoryController.add);
router.route('/course-category/get').get([isAuthenticated, isAdmin], courseCategoryController.get);
router.route("/course-category/getCategory/:id").get([isAuthenticated,isAdmin],courseCategoryController.getCategory)
router.route('/course-category/edit/:id').put([isAuthenticated, isAdmin], courseCategoryController.edit);
router.route('/course-category/delete/:id').delete([isAuthenticated, isAdmin], courseCategoryController.delete);
router.route('/course-category/getAll').get([isAuthenticated, isAdmin], courseCategoryController.getAll);

// Games
router.route('/game/training-wheel-game/create').post([isAuthenticated, isAdmin], gamesController.createTrainingWheelGame);
router.route('/game/training-wheel-game/get').get([isAuthenticated, isAdmin], gamesController.getTrainingWheelQuestions);
router.route('/game/training-wheel-game/delete/:id').delete([isAuthenticated, isAdmin], gamesController.deleteTWQuestion);
router.route('/game/training-wheel-game/get-game/:id').get([isAuthenticated, isAdmin], gamesController.getTWGame);
router.route('/game/training-wheel-game/update/:id').put([isAuthenticated, isAdmin], gamesController.updateTrainingWheelGame);

// Game category
router.route('/game-category/add').post([isAuthenticated, isAdmin], gameCategoryController.add);
router.route('/game-category/get').get([isAuthenticated, isAdmin], gameCategoryController.get);
router.route('/game-category/getCategory/:id').get([isAuthenticated,isAdmin],gameCategoryController.getCategory)
router.route('/game-category/getAll').get([isAuthenticated, isAdmin], gameCategoryController.getAll);
router.route('/game-category/edit/:id').put([isAuthenticated, isAdmin], gameCategoryController.edit);
router.route('/game-category/delete/:id').delete([isAuthenticated, isAdmin], gameCategoryController.delete);






// DISCARDED
// router.route('/manageusers/getUsers').get([isAuthenticated, isAdmin], manageUsersController.getUsers);
// router.route('/manageusers/search').get([isAuthenticated, isAdmin], manageUsersController.search);

// router.route('/city/add').post([isAuthenticated, isAdmin], cityController.add);
// State routes
// router.route('/state/add').post([isAuthenticated, isAdmin], stateController.add);

// router.route('/course-category/create').post([isAuthenticated, isAdmin], courseCategoryController.create);

// router.route('/course-category/getAll').get([isAuthenticated, isAdmin], courseCategoryController.getAll);

export default router;
