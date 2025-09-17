import Admin from "../../../models/admin.js";
import ResetPasswordUsingLink from "../../../utils/auth/ResetPasswordUsingLink.js";


class AdminResetPasswordUsingLink extends ResetPasswordUsingLink {
    userType = "Admin"

    constructor() {
        super(Admin);
    }
}

export default AdminResetPasswordUsingLink;