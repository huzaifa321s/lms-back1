import Teacher from "../../../models/teacher.js";
import ResetPasswordUsingOTP from "../../../utils/auth/ResetPasswordUsingOTP.js";


class TeacherResetPassword extends ResetPasswordUsingOTP {
    userType = "Teacher"

    constructor() {
        super(Teacher);
    }
}

export default TeacherResetPassword;