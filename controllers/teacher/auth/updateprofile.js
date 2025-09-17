import mongoose from "mongoose";
import City from "../../../models/city.js";
import State from "../../../models/state.js";
import Teacher from "../../../models/teacher.js";
import UpdateProfile from "../../../utils/auth/UpdateProfile.js";

class TeacherUpdateProfile extends UpdateProfile {
    userType = "Teacher"
    profileImagePath = "public/teacher/profile"
    validateFieldsFlag = false;
    dbValidationsFlag = false;

    constructor() {
        super(Teacher);
    }

    validateFields(fields) {
        // const { experience } = fields;
        // if (experience && (!Array.isArray(experience) || experience.some(exp => typeof exp !== 'object' || !exp.company || !exp.years))) {
        //     errorMessage = "Invalid experience format. It should be an array of objects with 'company' and 'years' properties.";
        //     return errorMessage;
        // }

        // return null;
    }

    async dbValidationsCheck(userDetails) {
        // const { city, state } = userDetails;

        // let errorMessage = "";

        // if(city) {
        //     if (!mongoose.Types.ObjectId.isValid(city)) {
        //         errorMessage = "Invalid city id!";
        //     }
    
        //     const existingCity = await City.findById(city);
        //     if (!existingCity) {
        //         errorMessage = "City not found";
        //         return errorMessage;
        //     }
        // }

        // if(state) {
        //     if (!mongoose.Types.ObjectId.isValid(state)) {
        //         errorMessage = "Invalid state id!";
        //     }
        //     const existingState = await State.findById(state);
        //     if (!existingState) {
        //         errorMessage = "State not found";
        //         return errorMessage;
        //     }
        // }

        // return null;
    }

    async updateUser(user, updatedFields) {
        const { profile, firstName, lastName, bio, specialization, qualification, address } = updatedFields;
      

        console.log("profile --> ", profile)

        if (profile) user.profile = profile;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (bio) user.bio = bio;
        if (specialization) user.specialization = specialization;
        if (qualification) user.qualification = qualification;
        // if (experience) user.experience = experience;
        // if (city) user.city = new mongoose.Types.ObjectId(city);
        // if (state) user.state = new mongoose.Types.ObjectId(state);
        if (address) user.address = address;

        await user.save();

        return user
    }

}

export default TeacherUpdateProfile;