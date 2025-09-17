import Teacher from "../../../models/teacher.js";
import ChangePassword from "../../../utils/auth/ChangePassword.js";

class TeacherChangePassword extends ChangePassword {
    userType = "Teacher"

    constructor() {
        super(Teacher);
    }
}

export default TeacherChangePassword