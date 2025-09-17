import Admin from "../../../models/admin.js";
import Login from "../../../utils/auth/Login.js";

class AdminLogin extends Login {
    userType = "Admin";
    verfiedAccountCheck = false;
    twoFactorFeature = false;

    constructor() {
        super(Admin);
    }

    async getCredentials(user) {
        return {
            _id: user._id,
            profile: user.profile,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        };
    }
}

export default AdminLogin
