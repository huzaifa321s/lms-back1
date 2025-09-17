import mongoose from "mongoose";
import City from "../../../models/city.js";
import State from "../../../models/state.js";
import Student from "../../../models/student.js";
import UpdateProfile from "../../../utils/auth/UpdateProfile.js";

class StudentUpdateProfile extends UpdateProfile {
    userType = "Student"
    profileImagePath = "public/student/profile"
    validateFieldsFlag = false;
    dbValidationsFlag = false;

    constructor() {
        super(Student);
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
        const { profile, firstName, lastName, bio, phone, dateOfBirth } = updatedFields;

        if (profile) user.profile = profile;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (bio) user.bio = bio;
        if (phone) user.phone = phone;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;

        await user.save();

        return user;
    }

}

export default StudentUpdateProfile;