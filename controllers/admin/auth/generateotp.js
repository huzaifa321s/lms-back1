import Admin from "../../../models/admin.js";
import GenerateOTP from "../../../utils/auth/GenerateOTP.js";

class AdminGenerateOTP extends GenerateOTP {
    userType = "Admin"

    constructor() {
        super(Admin);
    }
}

export default AdminGenerateOTP