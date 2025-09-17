import Student from "../../../models/student.js";
import GenerateOTP from "../../../utils/auth/GenerateOTP.js";

class UserGenerateOTP extends GenerateOTP {
    userType = "Student"

    constructor() {
        super(Student);
    }
}

export default UserGenerateOTP