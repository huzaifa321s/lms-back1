import express from "express"
import studentController from "../controllers/student/student.js";
import paymentController from "../controllers/student/payment.js";
import courseController from "../controllers/student/course.js";
import gamesController from "../controllers/student/games.js";

// Middlewares
import { isAuthenticated, isStudent } from "../middlewares/Auth.js";
import {isSubscriber} from "../middlewares/isSubscriber.js";
import dashboardController from "../controllers/student/dashboard.js";


const router = express.Router();


// Auth
router.route('/register').post(studentController.register);
router.route('/login').post(studentController.login);
router.route('/verifyUser').put(studentController.verifyUser);
router.route('/verifyTwoFactor').post(studentController.verifyTwoFactor);
router.route('/verifyForgotPasswordOTP').put(studentController.verifyForgotPasswordOTP);
router.route('/generateOTP').put(studentController.generateOTP);
router.route('/forgotPassword').post(studentController.forgotPassword);
router.route('/resetPassword/:id/:token').post(studentController.resetPassword);
router.route('/updateProfile').put([isAuthenticated, isStudent], studentController.updateProfile);
router.route('/updatePassword').put([isAuthenticated, isStudent], studentController.updatePassword);

// Dealing with subscription
router.route('/payment/subscribe').post([isAuthenticated, isStudent], paymentController.subscribe);
router.route('/payment/resubscribe').post([isAuthenticated, isStudent], paymentController.resubscribe);
router.route('/payment/get-payment-methods').get([isAuthenticated, isStudent], paymentController.getPaymentMethods);
router.route('/payment/add-new-payment-method').post([isAuthenticated, isStudent], paymentController.addNewPaymentMethod);
router.route('/payment/detach-payment-method/:id').delete([isAuthenticated, isStudent], paymentController.detachPaymentMethod);
router.route('/payment/set-card-as-default/:id').put([isAuthenticated, isStudent], paymentController.setCardAsDefault);
router.route('/payment/get-invoices').get([isAuthenticated, isStudent], paymentController.getAllInvoices);
router.route('/payment/get-invoices/:id').get([isAuthenticated,isStudent],paymentController.getInvoice)
router.route('/payment/pay-invoice').post([isAuthenticated, isStudent], paymentController.payInvoice);

// Only subscriber can acces
// dahsboard route
router.route('/dashboard/overview').get([isAuthenticated,isStudent],dashboardController.get);

router.route('/course/enroll').post([isAuthenticated, isStudent, isSubscriber], courseController.enrollCourse);
router.route('/course/enrolled-courses/get').get([isAuthenticated, isStudent, isSubscriber], courseController.getEnrolledCourses);
router.route('/course/get-teachers').get([isAuthenticated,isStudent,isSubscriber],courseController.getCourseTeachers);
router.route('/course/get-teacher/:id').get([isAuthenticated,isStudent,isSubscriber],courseController.getTeacher);
router.route('/course/get-teacher-courses').get([isAuthenticated,isStudent,isSubscriber],courseController.get);
router.route('/course/get-enrolled-course/:id').get([isAuthenticated, isStudent, isSubscriber], courseController.getEnrolledCourseDetails);
router.route('/payment/cancel-subscription/:id').delete([isAuthenticated, isStudent, isSubscriber], paymentController.cancelSubscription);
router.route('/payment/update-subscription-plan').put([isAuthenticated, isStudent, isSubscriber], paymentController.updateSubscriptionPlan);

// Games
router.route('/game/training-wheel-game/submit').post([isAuthenticated, isStudent, isSubscriber], gamesController.submit);
router.route('/game/training-wheel-game/get').get([isAuthenticated, isStudent, isSubscriber], gamesController.get);







// // DISCARDED
// router.route('/resetForgottenPassword').put(studentController.resetForgottenPassword);

// // Testing payment intent.
// router.route('/payment/config').get(paymentController.paymentConfig);
// router.route('/payment/create-payment-intent').post(paymentController.createPaymentIntent);

// // NOT IN USE
// router.route('/payment/create-customer').post([isAuthenticated, isStudent], paymentController.createCustomer);

export default router;