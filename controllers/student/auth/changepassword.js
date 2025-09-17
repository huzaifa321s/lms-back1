import Student from "../../../models/student.js";
import ChangePassword from "../../../utils/auth/ChangePassword.js";

class StudentChangePassword extends ChangePassword {
    userType = "Student"

    constructor() {
        super(Student);
    }
}

export default StudentChangePassword