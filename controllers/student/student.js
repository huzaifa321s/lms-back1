import StudentLogin from "./auth/login.js";
import StudentRegister from "./auth/register.js";
import StudentTwoFactorVerification from "./auth/twofactorverification.js";
import StudentVerification from "./auth/verifyuser.js";
import StudentVerifyOTPForgotPassword from "./auth/verifyotp.js";
import StudentGenerateOTP from "./auth/generateotp.js";
import StudentForgotPassword from "./auth/forgotpassword.js";
import StudentResetPasswordUsingLink from "./auth/resetpasswordusinglink.js";
import StudentUpdateProfile from "./auth/updateprofile.js";
import StudentChangePassword from "./auth/changepassword.js";

const studentController = {
  register: async (req, res) => new StudentRegister().register(req, res),
  login: async (req, res) => new StudentLogin().loginUser(req, res),
  verifyUser: async (req, res) => new StudentVerification().verify(req, res),
  verifyTwoFactor: async (req, res) => new StudentTwoFactorVerification().verify(req, res),
  verifyForgotPasswordOTP: async (req, res) => new StudentVerifyOTPForgotPassword().verify(req, res),
  generateOTP: async (req, res) => new StudentGenerateOTP().generate(req, res),
  forgotPassword: async (req, res) => new StudentForgotPassword().generateLink(req, res),
  resetPassword: async (req, res) => new StudentResetPasswordUsingLink().reset(req, res),
  updateProfile: async (req, res) => new StudentUpdateProfile().update(req, res),
  updatePassword: async (req, res) => new StudentChangePassword().change(req, res),
};

export default studentController;