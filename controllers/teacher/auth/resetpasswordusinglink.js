import Teacher from "../../../models/teacher.js";
import ResetPasswordUsingLink from "../../../utils/auth/ResetPasswordUsingLink.js";


class TeacherResetPasswordUsingLink extends ResetPasswordUsingLink {
    userType = "Teacher"

    constructor() {
        super(Teacher);
    }
}

export default TeacherResetPasswordUsingLink;