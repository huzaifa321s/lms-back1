import Teacher from "../../../models/teacher.js";
import VerifyOTP from "../../../utils/auth/VerifyOTP.js";


class TeacherVerifyOTP extends VerifyOTP {
    userType = "Teacher"
    checkTokenExpiryFlag = false;

    constructor() {
        super(Teacher);
    }
}

export default TeacherVerifyOTP;