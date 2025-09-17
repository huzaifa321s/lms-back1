import Student from "../../../models/student.js";
import ResetPasswordUsingLink from "../../../utils/auth/ResetPasswordUsingLink.js";


class StudentResetPasswordUsingLink extends ResetPasswordUsingLink {
    userType = "Student"

    constructor() {
        super(Student);
    }
}

export default StudentResetPasswordUsingLink;