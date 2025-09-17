import Student from "../../../models/student.js";
import VerifyTwoFactor from "../../../utils/auth/VerifyTwoFactor.js";


class UserTwoFactorVerification extends VerifyTwoFactor {
    userType = "Student"

    constructor() {
        super(Student);
    }

    getCredentials(user) {
        return {
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            email: user.email,
            address: user.address
        };
    }
}

export default UserTwoFactorVerification;