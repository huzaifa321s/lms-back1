// Utils;
import ErrorHandler from "../functions/ErrorHandler.js";
import { generateOTP } from "../functions/HelperFunctions.js";
import SuccessHandler from "../functions/SuccessHandler.js";
import sendMail from "../functions/sendMail.js";

class Login {
    userType = "<User Type>";
    twoFactorFeature = false;
    verfiedAccountCheck = false;

    constructor(userModel) {
        this.userModel = userModel;
    }

    async loginUser(req, res) {
        const userData = req.body;
        console.log('code run')
        try {
            const validationErrorMessage = this.validateFields(userData);
            if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

            const user = await this.checkUserExist(userData);
            if (!user) return ErrorHandler(`${this.userType} not found`, 400, res);

            if (this.verfiedAccountCheck && !this.isVerified(user)) {
                return ErrorHandler(`${this.userType} not verified`, 400, res);
            }

            const isMatch = await user.comparePassword(userData.password);
            if (!isMatch) return ErrorHandler("Password does not match!", 400, res);

            if (this.twoFactorFeature && this.twoFactorLogin(user)) {
                return SuccessHandler(null, 200, res, "Two-factor authentication code is sent to your email");
            } else {
                const credentials = await this.getCredentials(user);
                const token = await user.getJWTToken();
                console.log('credentials ===>',credentials);
                console.log('token ===>',token);

                return SuccessHandler({ credentials, token }, 200, res, `${this.userType} authenticated, logged in successfully!`);
            }
        } catch (error) {
            console.error(`Error verifying ${this.userType}:`, error);
            return ErrorHandler(`Internal server error`, 500, res);
        }
    }


    validateFields(fields) {
        const requiredFields = ['email', 'password'];
        const missingFields = requiredFields.filter(f => !fields[f]);

        let errorMessage = "";
        if (missingFields.length > 0) {
            errorMessage = `Please provide required fields: ${missingFields.join(', ')}.`;
            return errorMessage;
        }

        return null;
    }


    async checkUserExist(reqBody) {
        const { email } = reqBody;
        const user = await this.userModel.findOne({ email });
        return user
    }


    async twoFactorLogin(user) {
        if (user.twoFactorAuthentication) {
            user.otp = generateOTP(4);
            user.otpGenerateAt = new Date();
            await user.save();

            const subject = `Two Factor Authentication`;
            const message = `Your two-factor authentication code is ${user.otp}.`;
            await sendMail(user.email, subject, message);

            return true
        } else {
            return false
        }
    }


    async getCredentials(user) {
        return {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        };
    }

    isVerified(user) {
        return user.verifiedUser;
    }
}

export default Login;
