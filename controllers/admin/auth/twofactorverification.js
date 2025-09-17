
import Admin from "../../../models/admin.js";
import VerifyTwoFactor from "../../../utils/auth/VerifyTwoFactor.js";


class AdminTwoFactorVerification extends VerifyTwoFactor {
    userType = "Admin"
    
    constructor() {
        super(Admin);
    }
}

export default AdminTwoFactorVerification;