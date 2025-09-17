import Student from "../../../models/student.js";
import VerifyOTP from "../../../utils/auth/VerifyOTP.js";


class StudentVerifyOTPForgotPassword extends VerifyOTP {
    userType = "Student"
    checkTokenExpiryFlag = false;

    constructor() {
        super(Student);
    }
}

export default StudentVerifyOTPForgotPassword;