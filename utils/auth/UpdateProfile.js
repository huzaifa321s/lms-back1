import { saveFile, deleteFile } from "../functions/HelperFunctions.js";
import ErrorHandler from "../functions/ErrorHandler.js";
import SuccessHandler from "../functions/SuccessHandler.js";

class UpdateProfile {
    userType = "<User Type>";
    profileImagePath = "public/user/profile"
    validateFieldsFlag = false;
    dbValidationsFlag = false;


    constructor(userModel) {
        this.userModel = userModel;
      }

    async update(req, res) {
        let reqBody = req.body;
        const user = req.user;
        const mediaFiles = req.files;
        console.log('req.body ===>',req.body);

        try {
            if (this.validateFieldsFlag) {
                const validationErrorMessage = this.validateFields(reqBody);
                if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);
            }

            if (this.dbValidationsFlag) { // this is for async-await validations (optional)
                const dbValidationsError = await this.dbValidationsCheck(reqBody);
                if (dbValidationsError) return ErrorHandler(dbValidationsError, 400, res);
            }

            const userExist = await this.checkExistingUser(user);
            if (!userExist) return ErrorHandler(`No ${this.userType} found with this email`, 404, res);

            const updatedProfile = this.updateProfileImage(userExist, mediaFiles);
            reqBody = { profile: updatedProfile, ...reqBody };

            const updatedUser = await this.updateUser(userExist, reqBody);

            return SuccessHandler(updatedUser, 200, res, `${this.userType} profile updated successfully!`);
        } catch (error) {
            console.error("Error updating profile details:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }


    validateFields(fields) {
        // Method to override. 
    }

    async dbValidationsCheck(userDetails) {
        // over ride this method in child classes.
    }

    async checkExistingUser(user) {
        const userId = user._id;
        return await this.userModel.findById(userId);
    }

    updateProfileImage(user, mediaFiles) {
        if (mediaFiles && mediaFiles.profile && user.profile) {
            const deletedFile = deleteFile(user.profile, this.profileImagePath);
            if (!deletedFile) console.log("Deletion Error: 'Error while deleting previous profile image!'");
        }

        if (mediaFiles && mediaFiles.profile) {
            const { profile } = mediaFiles;
            const uploadedImage = saveFile(profile, this.profileImagePath);
            return uploadedImage;
        }

        return null;
    }

    async updateUser(user, updatedFields) {
        const { profile, firstName, lastName } = updatedFields;
      
        if (profile) user.profile = profile;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;

        await user.save();
        
        return Object.fromEntries(Object.entries(updatedFields).filter(([k, v]) => !v));
    }
}

export default UpdateProfile;
