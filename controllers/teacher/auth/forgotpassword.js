import Teacher from "../../../models/teacher.js";
import ForgotPassword from "../../../utils/auth/ForgotPassword.js";


class TeacherForgotPassword extends ForgotPassword {
    userType = "Teacher"
    resetPasswordBaseUrl = 'http://localhost:3000/teacher/reset-password';

    constructor() {
        super(Teacher);
    }
}

export default TeacherForgotPassword;