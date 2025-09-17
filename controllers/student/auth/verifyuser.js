import Student from "../../../models/student.js";
import VerifyUser from "../../../utils/auth/VerifyUser.js";


class UserVerification extends VerifyUser {
    userType = "Student"
    expiryTimeInMinutes = 2

    
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


export default UserVerification;