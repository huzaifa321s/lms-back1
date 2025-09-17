import Teacher from "../../../models/teacher.js";
import VerifyUser from "../../../utils/auth/VerifyUser.js";


class TeacherVerification extends VerifyUser {
    userType = "Teacher"
    expiryTimeInMinutes = 50
    
    constructor() {
        super(Teacher);
    }

    async checkUserExist(reqBody) {
        const { email } = reqBody;
        const user = await this.userModel.findOne({ email }).populate({
            path: 'city', select: 'name'
        }).populate({
            path: 'state',  select: 'name'
        });

        return user
    }

    getCredentials(user) {
        return {
            profile: user.profile || null,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            experience: user.experience,
            email: user.email,
            address: user.address,
            state: user.state,
            city: user.city,
        };
    }

}


export default TeacherVerification;