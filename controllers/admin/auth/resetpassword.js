import Admin from "../../../models/admin.js";
import ResetPasswordUsingOTP from "../../../utils/auth/ResetPasswordUsingOTP.js";


class AdminResetPassword extends ResetPasswordUsingOTP {
    userType = "Admin"

    constructor() {
        super(Admin);
    }
}

export default AdminResetPassword;