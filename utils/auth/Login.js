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
  console.log("userData ===>",userData);

  try {
    // ✅ Validate fields
    const validationErrorMessage = this.validateFields(userData);
    if (validationErrorMessage) {
      return ErrorHandler(validationErrorMessage, 400, res);
    }

    // ✅ Check if user exists
    const user = await this.checkUserExist(userData);
    if (!user) {
      return ErrorHandler(`${this.userType} not found`, 400, res);
    }

    // ✅ Check if account is verified (if required)
    if (this.verfiedAccountCheck && !this.isVerified(user)) {
      return ErrorHandler(`${this.userType} not verified`, 400, res);
    }

    // ✅ Compare password
    const isMatch = await user.comparePassword(userData.password);
    if (!isMatch) {
      return ErrorHandler("Password does not match!", 400, res);
    }

    // ✅ Handle Two-Factor Authentication
    if (this.twoFactorFeature && this.twoFactorLogin(user)) {
      return SuccessHandler(
        null,
        200,
        res,
        "Two-factor authentication code has been sent to your email."
      );
    }

    // ✅ Generate Credentials & Token
    const credentials = await this.getCredentials(user);
    const token = await user.getJWTToken();

    console.log("credentials ===>", credentials);
    console.log("token ===>", token);

    return SuccessHandler(
      { credentials, token },
      200,
      res,
      `${this.userType} authenticated and logged in successfully!`
    );
  } catch (error) {
    console.error(`Error logging in ${this.userType}:`, error);
    return ErrorHandler("Internal server error", 500, res);
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
        console.log('this.userModel ===>',this.userModel)
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
