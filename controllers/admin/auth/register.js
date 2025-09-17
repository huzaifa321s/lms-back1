import Admin from "../../../models/admin.js";
import Register from "../../../utils/auth/Register.js";

class AdminRegister extends Register {
    userType = "Admin"

    constructor() {
        super(Admin);
    }
}


export default AdminRegister;