import express from "express"
import studentPaymentController from "../controllers/student/payment.js";

const router = express.Router();

// router.route('/subs').post(studentPaymentController.handleWebhook);
router.post('/subs', express.raw({type: 'application/json'}), studentPaymentController.webhook);

export default router;