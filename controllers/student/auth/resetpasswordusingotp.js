import Student from "../../../models/student.js";
import ResetPasswordUsingOTP from "../../../utils/auth/ResetPasswordUsingOTP.js";


class UserResetPassword extends ResetPasswordUsingOTP {
    userType = "Student"

    constructor() {
        super(Student);
    }
}

export default UserResetPassword;