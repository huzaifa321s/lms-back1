import Admin from "../../../models/admin.js";
import VerifyOTP from "../../../utils/auth/VerifyOTP.js";


class AdminVerifyOTP extends VerifyOTP {
    userType = "Admin"

    constructor() {
        super(Admin);
    }
}

export default AdminVerifyOTP;