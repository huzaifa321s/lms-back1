import Teacher from "../../../models/teacher.js";
import VerifyTwoFactor from "../../../utils/auth/VerifyTwoFactor.js";


class TeacherTwoFactorVerification extends VerifyTwoFactor {
    userType = "Teacher"

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

export default TeacherTwoFactorVerification;