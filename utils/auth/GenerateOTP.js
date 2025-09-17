// Utils;
import ErrorHandler from "../functions/ErrorHandler.js";
import { generateOTP } from "../functions/HelperFunctions.js";
import SuccessHandler from "../functions/SuccessHandler.js";
import sendMail from "../functions/sendMail.js";



class GenerateOTP {
    userType = "<User Type>";

    constructor(userModel) {
        this.userModel = userModel;
    }

    async generate(req, res) {
        const body = req.body;
        try {
            const validationErrorMessage = this.validateFields(body);
            if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

            const user = await this.checkUserExist(body);
            if (!user) return ErrorHandler(`${this.userType} not found`, 400, res)

            await this.sendOTP(user, body);

            return SuccessHandler(null, 200, res, `OTP is sent to your email.`);
        } catch (error) {
            console.error(`Error:`, error);
            return ErrorHandler(`Internal server error`, 500, res);
        }
    }


    validateFields(fields) {
        const { email } = fields;
        let errorMessage = "";
        if (!email) {
            errorMessage = `Please provide the email to request OTP`;
            return errorMessage;
        }
        return null;
    }


    async checkUserExist(user) {
        const { email } = user;
        return await this.userModel.findOne({ email });
    }


    async sendOTP(user, body) {
        const { otpLength } = body;
        user.otp = generateOTP(otpLength || 4);
        user.otpVerified = false;
        user.otpGenerateAt =  new Date();
        await user.save();

        const subject = `One-Time Passowrd`;
        const message = `Your OTP authentication code is ${user.otp}.`;
        await sendMail(user.email, subject, message);
    }


}


export default GenerateOTP;