import TeacherLogin from "./auth/login.js";
import TeacherRegister from "./auth/register.js";
import TeacherTwoFactorVerification from "./auth/twofactorverification.js";
import TeacherVerification from "./auth/verifyuser.js";
import TeacherGenerateOTP from "./auth/generateotp.js";
import TeacherVerifyOTP from "./auth/verifyotp.js";
import TeacherUpdateProfile from "./auth/updateprofile.js";
import TeacherChangePassword from "./auth/changepassword.js";
import TeacherForgotPassword from "./auth/forgotpassword.js";
import TeacherResetPasswordUsingLink from "./auth/resetpasswordusinglink.js";

const teacherController = {
  register: async (req, res) => new TeacherRegister().register(req, res),
  login: async (req, res) => new TeacherLogin().loginUser(req, res),
  verifyUser: async (req, res) => new TeacherVerification().verify(req, res),
  verifyTwoFactor: async (req, res) => new TeacherTwoFactorVerification().verify(req, res),
  verifyOTP: async (req, res) => new TeacherVerifyOTP().verify(req, res),
  generateOTP: async (req, res) => new TeacherGenerateOTP().generate(req, res),
  updateProfile: async (req, res) => new TeacherUpdateProfile().update(req, res),
  forgotPassword: async (req, res) => new TeacherForgotPassword().generateLink(req, res),
  resetPassword: async (req, res) => new TeacherResetPasswordUsingLink().reset(req, res),
  updatePassword: async (req, res) => new TeacherChangePassword().change(req, res),
};

export default teacherController;