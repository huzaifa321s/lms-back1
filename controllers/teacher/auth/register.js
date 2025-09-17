import mongoose from "mongoose";
import Teacher from "../../../models/teacher.js";
import { generateOTP, saveFile } from "../../../utils/functions/HelperFunctions.js";
import Register from "../../../utils/auth/Register.js";
import City from "../../../models/city.js";
import State from "../../../models/state.js";

class TeacherRegister extends Register {
    userType = "Teacher"
    profileImagePath = 'public/teacher/profile'
    loginAfterRegiser = true; // sendOTPFlag must be false

    // sendOTPFlag = true;
    // dbValidations = true;

    constructor() {
        super(Teacher);
    }

    validateFields(fields) {
        const requiredFields = ["firstName", "lastName", "email", "password" ];
        const missingFields = requiredFields.filter(f => !fields[f]);

        let errorMessage = "";
        if (missingFields.length > 0) {
            errorMessage = `Please provide all required fields: ${missingFields.join(', ')}.`;
            return errorMessage;
        }

        // const { experience } = fields;
        // if (!Array.isArray(experience) || experience.some(exp => typeof exp !== 'object' || !exp.company || !exp.years)) {
        //     errorMessage = "Invalid experience format. It should be an array of objects with 'company' and 'years' properties.";
        //     return errorMessage;
        // }

        return null;
    }

    // async dbValidationsCheck(userDetails) {
    //     const { city, state } = userDetails;

    //     let errorMessage = "";
    //     if (!mongoose.Types.ObjectId.isValid(city)) {
    //         errorMessage = "Invalid city id!";
    //     }

    //     const existingCity = await City.findById(city);
    //     if (!existingCity) {
    //         errorMessage = "City not found";
    //         return errorMessage;
    //     }

    //     if (!mongoose.Types.ObjectId.isValid(state)) {
    //         errorMessage = "Invalid state id!";
    //     }
    //     const existingState = await State.findById(state);
    //     if (!existingState) {
    //         errorMessage = "State not found";
    //         return errorMessage;
    //     }

    //     return null;
    // }

    // uploadProfile(mediaFiles) {
    //     if (mediaFiles && mediaFiles.profile) {
    //       const { profile } = mediaFiles;
    //       const uploadedImage = saveFile(profile, 'public/teacher/profile');
    //       return uploadedImage;
    //     }
    //   }

    async createUser(userDetails) {
        const { profile, firstName, lastName, email, password } = userDetails;

        let user = {
            profile,
            firstName,
            lastName,
            // bio,
            // specialization,
            // qualification,
            // experience,
            email,
            password,
            // address,
            // city: new mongoose.Types.ObjectId(city),
            // state: new mongoose.Types.ObjectId(state),
            otp: this.sendOTPFlag ? generateOTP(4) : null,
            otpGenerateAt: this.sendOTPFlag && this.setTokenExpiry ? new Date() : null,
        };

        const newUser = new this.userModel(user);
        await newUser.save();

        return newUser;
    }

    async getCredentials(user) {
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

export default TeacherRegister;
