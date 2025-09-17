import path from "path";
import sendMail from "../functions/sendMail.js";
import { generateOTP, saveFile } from "../functions/HelperFunctions.js";
import ErrorHandler from "../functions/ErrorHandler.js";
import SuccessHandler from "../functions/SuccessHandler.js";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



class Register {
  userType = "<User Type>";
  profileImagePath = "public/profiles/user" // Starts from public folder.
  sendOTPFlag = false;
  dbValidations = false;
  loginAfterRegiser = false;

  constructor(userModel) {
    this.userModel = userModel;
  }

  async register(req, res) {
    let userData = req.body;
    const mediaFiles = req.files;
  console.log("userData ===>",userData);
    try {

      const validationErrorMessage = this.validateFields(userData);
      if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

      if (this.dbValidations) { // this is for async-await validations (optional)
        const dbValidationsError = await this.dbValidationsCheck(userData);
        if (dbValidationsError) return ErrorHandler(dbValidationsError, 400, res);
      }

      const existingUser = await this.checkExistingUser(userData);
      if (existingUser) return ErrorHandler(`${this.userType} already exist with this email`, 400, res);

      const uploadedProfile = this.uploadProfile(mediaFiles);
      userData = { profile: uploadedProfile, ...userData };

      const userObj = await this.createUser(userData);

      if (this.sendOTPFlag) {
        await this.sendOTP(userObj);
        return SuccessHandler(null, 201, res, "OTP sent to email, verify account to register.");
      }

      if (!this.sendOTPFlag && this.loginAfterRegiser) {
        const credentials = await this.getCredentials(userObj);
        const token = await userObj.getJWTToken();

        return SuccessHandler({ credentials, token }, 200, res, `${this.userType} authenticated, logged in successfully!`);
      }


      return SuccessHandler(null, 201, res, `${this.userType} registered successfully!`);
    } catch (error) {
      console.error("Error:", error);
      return ErrorHandler('Internal server error', 500, res);
    }
  }

  validateFields(fields) {
    const requiredFields = ['firstName', 'lastName', 'email', 'password'];
    const missingFields = requiredFields.filter(f => !fields[f]);
    

    let errorMessage = "";
    if (missingFields.length > 0) {
      errorMessage = `Please provide all required fields: ${missingFields.join(', ')}.`;
      return errorMessage;
    }

    return null;
  }

  async dbValidationsCheck(userDetails) {
    // over ride this method in child classes.
  }

  async checkExistingUser(user) {
    const { email } = user;
    return await this.userModel.findOne({ email });
  }

  async createUser(userDetails) {
    const { profile, firstName, lastName, email, password } = userDetails;
    let user = {
      profile,
      firstName,
      lastName,
      email,
      password,
      otp: this.sendOTPFlag ? generateOTP(4) : null,
      otpGenerateAt: this.sendOTPFlag ? new Date() : null,
      verifiedUser: this.sendOTPFlag ? true : false
    }

    const newUser = new this.userModel(user);
    await newUser.save();

    return newUser;
  }


  uploadProfile(mediaFiles) {
    if (mediaFiles && mediaFiles.profile) {
      const { profile } = mediaFiles;
      const uploadedImage = saveFile(profile, this.profileImagePath);
      return uploadedImage;
    }
  }

  async sendOTP(userObj) {
    const { email, otp } = userObj;
    const subject = `${this.userType} verification`;
    const message = `Your user verification code is ${otp}.`;
    await sendMail(email, subject, message);
  }


  async getCredentials(user) {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }


}

export default Register;



