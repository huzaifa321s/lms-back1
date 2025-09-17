import ErrorHandler from "../functions/ErrorHandler.js";
import SuccessHandler from "../functions/SuccessHandler.js";


class VerifyTwoFactor {
    userType = "<User Type>";
    checkTokenExpiryFlag = true;
    expiryTimeInMinutes = 4;  // must check if the token is generated or not



    constructor(userModel) {
        this.userModel = userModel;
    }

    async verify(req, res) {
        const userData = req.body;
        try {
            const validationErrorMessage = this.validateFields(userData);
            if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

            const user = await this.checkUserExist(userData);
            if (!user) return ErrorHandler(`${this.userType} not found`, 400, res);

            if(this.checkTokenExpiryFlag) {
                const expiredToken = this.checkTokenExpiry(user)
                if (expiredToken) return ErrorHandler(`Token is expired, generate again`, 400, res);
            }

            const otpVerified = this.verifyOTP(user, userData.otp);

            if (otpVerified) {
                const credentials = this.getCredentials(user);
                const token = await user.getJWTToken();
                return SuccessHandler({ credentials, token }, 200, res, `${this.userType}  authenticated, logged in successfully!`);
            } else {
                return ErrorHandler("Invalid OTP!", 400, res);
            }

        } catch (error) {
            console.error(`Error verifying ${this.userType}:`, error);
            return ErrorHandler("Internal server error", 500, res);
        }
    }

    validateFields(fields) {
        const requiredFields = ['email', 'otp'];
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


    checkTokenExpiry(user) {
        const currentTime = new Date()
        const genrationTime = new Date(user.otpGenerateAt);
        
        const expiredIn = this.expiryTimeInMinutes * 60000;
        const timeDifference = currentTime.getTime() - genrationTime.getTime();

        if (timeDifference > expiredIn) {
            return true
        }

        return false
    }

    async verifyOTP(user, otp) {
        if (user.otp === otp) {
            user.otp = null;
            user.otpGenerateAt = null;

            await user.save();
            return true
        } else {
            return false
        }
    }

    getCredentials(user) {
        return {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        };
    }
}




export default VerifyTwoFactor;
