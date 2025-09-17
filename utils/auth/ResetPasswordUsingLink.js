import jwt from "jsonwebtoken";
// Utils;
import ErrorHandler from "../functions/ErrorHandler.js";
import SuccessHandler from "../functions/SuccessHandler.js";

const SECRET_KEY = process.env.SECRET_KEY;

class ResetPasswordUsingLink {
    userType = "<User Type>";

    constructor(userModel) {
        this.userModel = userModel;
    }

    async reset(req, res) {
        const reqBody = req.body;
        const reqParams = req.params;
        try {
            const validationErrorMessage = this.validateFields(reqParams, reqBody);
            if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

            const user = await this.checkUserExist(reqParams);
            if (!user) return ErrorHandler(`${this.userType} not found`, 400, res);

            const payload = await this.verifyTokenAndResetPassword(user, reqParams);
            if(!payload) return ErrorHandler(`Token not verified!`, 400, res);

            this.resetPassword(user, reqBody);

            return SuccessHandler(null, 200, res, `${this.userType}'s password reset successfully!`);
        } catch (error) {
            console.error(`Error verifying ${this.userType}:`, error);
            return ErrorHandler("Internal server error", 500, res);
        }
    }

    validateFields(params, body) {
        let errorMessage = "";
        const requiredParams = ['id', 'token'];
        const missingParams = requiredParams.filter(f => !params[f]);

        if (missingParams.length > 0) {
            errorMessage = `Please provide required params: ${missingParams.join(', ')}.`;
            return errorMessage;
        }

        const { password } = body;
        if (!password) {
            errorMessage = `Please provide new password for reseting password!`;
            return errorMessage;
        }
        return null;
    }

    async checkUserExist(params) {
        const { id } = params;
        return await this.userModel.findById(id);
    }

    async verifyTokenAndResetPassword(user, params) {
        const { password } = user;
        const { token } = params;

        const secret = SECRET_KEY + password;
        jwt.verify(token, secret, (err) => {
            if(err) {
                console.log("Err ---> ", err);
                return false;
            }
        });

        return true;
    }

    async resetPassword(user, reqBody) {
        const { password } = reqBody;
        user.password = password;
        await user.save();
    }


}


export default ResetPasswordUsingLink;