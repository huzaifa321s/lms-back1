import express from "express"
import testController from "../controllers/test.js";
import { isAuthenticated, isAdmin } from "../middlewares/Auth.js"

const router = express.Router();
// router.route('/getProducts').get(isAuthenticated, testController.getProducts);
// router.route('/postImage').post(testController.postImage);

// router.route('/searchUser').get(testController.searchUser);

// // Relational db 
router.route('/test').post(testController.test);
router.route('/test2').post(testController.test2);
// router.route('/addState').post(testController.addState);
// router.route('/searchCities').get(testController.searchCities);
// router.route('/searchStates').get(testController.searchStates);
 

export default router;