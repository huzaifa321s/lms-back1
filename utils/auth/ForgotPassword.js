import jwt from "jsonwebtoken";
// Utils;
import ErrorHandler from "../functions/ErrorHandler.js";
import SuccessHandler from "../functions/SuccessHandler.js";
import sendMail from "../functions/sendMail.js";

const SECRET_KEY = process.env.SECRET_KEY;

class ForgotPassword {
    userType = "<User Type>";
    resetPasswordBaseUrl = 'http://localhost:3000/reset-password';
    linkExpiry = '15m'

    constructor(userModel) {
        this.userModel = userModel;
    }

    async generateLink(req, res) {
        const body = req.body;
        try {
            const validationErrorMessage = this.validateFields(body);
            if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

            const user = await this.checkUserExist(body);
            if (!user) return ErrorHandler(`${this.userType} not found`, 400, res);

            const link = this.createLink(user);
            await this.sendLink(user, link);

            return SuccessHandler(null, 200, res, `Reset Password link is sent to the email!`);
        } catch (error) {
            console.error(`Error:`, error);
            return ErrorHandler(`Internal server error`, 500, res);
        }
    }


    validateFields(fields) {
        const { email } = fields;
        let errorMessage = "";
        if (!email) {
            errorMessage = `Please provide the email to request reset password!`;
            return errorMessage;
        }
        return null;
    }

    createLink(user) {
        const { _id, email, password } = user;
        const secret = SECRET_KEY + password;
        const payload = {_id, email}
        const token = jwt.sign(payload, secret, {expiresIn: this.linkExpiry});
        const link = `${this.resetPasswordBaseUrl}/${_id}/${token}`;
        return link;
    }


    async checkUserExist(user) {
        const { email } = user;
        return await this.userModel.findOne({ email });
    }


    async sendLink(user, link) {
        const subject = `Reset Password Link`;
        const message = `You reset password link is: ${link}.`;
        await sendMail(user.email, subject, message);
    }


}


export default ForgotPassword;