import Admin from "../../../models/admin.js";
import ForgotPassword from "../../../utils/auth/ForgotPassword.js";


class AdminForgotPassword extends ForgotPassword {
    userType = "Admin"
    resetPasswordBaseUrl = 'http://localhost:3000/admin/reset-password';

    constructor() {
        super(Admin);
    }
}

export default AdminForgotPassword;