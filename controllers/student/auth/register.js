import mongoose from "mongoose";
import Student from "../../../models/student.js";
import Subscription from "../../../models/subscription.js";
import EnrolledCourses from "../../../models/enrolledcourses.js";
import { generateOTP, getStudentActivePlan } from "../../../utils/functions/HelperFunctions.js";
import Register from "../../../utils/auth/Register.js";
import City from "../../../models/city.js";
import State from "../../../models/state.js";

class StudentRegister extends Register {
    userType = "Student"
    profileImagePath = 'public/student/profile'
    loginAfterRegiser = true; // sendOTPFlag must be false

    constructor() {
        super(Student);
    }

    validateFields(fields) {
        const requiredFields = ["firstName", "lastName", "email", "password" ];
        const missingFields = requiredFields.filter(f => !fields[f]);

        let errorMessage = "";
        if (missingFields.length > 0) {
            errorMessage = `Please provide all required fields: ${missingFields.join(', ')}.`;
            return errorMessage;
        }

        return null;
    }


    async createUser(userDetails) {
        const { profile, firstName, lastName, bio, email, password, address, city, state } = userDetails;

        let user = {
            profile,
            firstName,
            lastName,
            email,
            password,
            otp: this.sendOTPFlag ? generateOTP(4) : null,
            otpGenerateAt: this.sendOTPFlag && this.setTokenExpiry ? new Date() : null,
        };

        const newUser = new this.userModel(user);
        await newUser.save();
        return newUser;
    }

    async getCredentials(user) {
        
        const credentials = {
            _id: user._id,
            profile: user.profile,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            email: user.email,
            dateOfBirth: user.dateOfBirth,
            phone: user.phone,
            remainingEnrollmentCount: user.remainingEnrollmentCount,
            status: user.status,
            notifications: user.notifications,
            subscription: await getStudentActivePlan(user.subscriptionId),
            enrolledCourses: [],
            customerId: user.customerId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt

        }
        
        return credentials;
    }



}


export default StudentRegister;
