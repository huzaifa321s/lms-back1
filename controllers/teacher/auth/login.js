import Teacher from "../../../models/teacher.js";
import Login from "../../../utils/auth/Login.js";

class TeacherLogin extends Login {
    userType = "Teacher"
    // verfiedAccountCheck = true;
    // twoFactorFeature = true;


    constructor() {
        super(Teacher);
    }

    // async checkUserExist(reqBody) {
    //     const { email } = reqBody;
    //     const user = await this.userModel.findOne({ email }).populate({
    //         path: 'city', select: 'name'
    //     }).populate({
    //         path: 'state',  select: 'name'
    //     });

    //     return user
    // }


    getCredentials(user) {
        return {
            _id: user._id,
            profile: user.profile || null,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            qualification: user.qualification,
            email: user.email,
            address: user.address
        };
    }
}

export default TeacherLogin