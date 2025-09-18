
// Classes
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

const registeration = new TeacherRegister();
const login = new TeacherLogin();
const userVerification = new TeacherVerification();
const twoFactorAuthentication = new TeacherTwoFactorVerification();
const otpVerification = new TeacherVerifyOTP();
const otp = new TeacherGenerateOTP();
// const resetPasswordUsingOTP = new TeacherResetPasswordUsingOTP();
const updateProfile = new TeacherUpdateProfile();
const changePassword = new TeacherChangePassword();

const forgotPass = new TeacherForgotPassword();
const resetForgottenPassword = new TeacherResetPasswordUsingLink();


const teacherController = {
  // Authentication Methods:
  register: async (req, res) => await registeration.register(req, res),
  login: async (req, res) => await login.loginUser(req, res),
  verifyUser: async (req, res) => await userVerification.verify(req, res),
  verifyTwoFactor: async (req, res) => await twoFactorAuthentication.verify(req, res),
  verifyOTP: async (req, res) => await otpVerification.verify(req, res),
  generateOTP: async (req, res) => await otp.generate(req, res),
  // resetPassword: async (req, res) => await resetPasswordUsingOTP.reset(req, res),
  updateProfile: async (req, res) => await updateProfile.update(req, res),

  forgotPassword: async (req, res) => await forgotPass.generateLink(req, res),
  resetPassword: async (req, res) => await resetForgottenPassword.reset(req, res),

  updatePassword: async (req, res) => await changePassword.change(req, res)


};

export default teacherController;


