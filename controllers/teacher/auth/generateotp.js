import Teacher from "../../../models/teacher.js";
import GenerateOTP from "../../../utils/auth/GenerateOTP.js";

class UserGenerateOTP extends GenerateOTP {
    userType = "Teacher"

    constructor() {
        super(Teacher);
    }
}

export default UserGenerateOTP