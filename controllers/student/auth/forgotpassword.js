import Student from "../../../models/student.js";
import ForgotPassword from "../../../utils/auth/ForgotPassword.js";


class StudentForgotPassword extends ForgotPassword {
    userType = "Student"
    resetPasswordBaseUrl = 'http://localhost:3000/student/reset-password';

    constructor() {
        super(Student);
    }
}

export default StudentForgotPassword;