// Utils;
import ErrorHandler from "../functions/ErrorHandler.js";
import SuccessHandler from "../functions/SuccessHandler.js";

class ResetPasswordUsingOTP {
    userType = "<User Type>";

    constructor(userModel) {
        this.userModel = userModel;
    }

    async reset(req, res) {
        const userData = req.body;
        try {
            const validationErrorMessage = this.validateFields(userData);
            if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

            const user = await this.checkUserExist(userData);
            if (!user) return ErrorHandler(`${this.userType} not found`, 400, res);

            const otpVerified = await this.isOTPVerified(user);
            if(!otpVerified) return ErrorHandler("OTP is not verified!", 400, res);

            await this.resetPassword(user, userData);

            return SuccessHandler(null, 200, res, `${this.userType}'s password reset successfully!`);
        } catch (error) {
            console.error(`Error verifying ${this.userType}:`, error);
            return ErrorHandler("Internal server error", 500, res);
        }
    }

    validateFields(fields) {
        const requiredFields = ['email', 'newPassword'];
        const missingFields = requiredFields.filter(f => !fields[f]);

        let errorMessage = "";
        if (missingFields.length > 0) {
            errorMessage = `Please provide required fields: ${missingFields.join(', ')}.`;
            return errorMessage;
        }

        return null;
    }

    async checkUserExist(user) {
        const { email } = user;
        return await this.userModel.findOne({ email });
    }

    async isOTPVerified(user) {
        if (user.otpVerified) {
            user.otpVerified = false;

            await user.save();
            return true;
        }
        return false
    }

    async resetPassword(user, reqBody) {
        const { newPassword } = reqBody;

        user.password = newPassword;
        await user.save();
    }


}


export default ResetPasswordUsingOTP;