// Classes
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

// DISCARDED | NOT USED
// import StudentResetPasswordUsingOTP from "./auth/resetpasswordusingotp.js";

const registeration = new StudentRegister();
const login = new StudentLogin();
const verifyStudent = new StudentVerification();
const twoFactorAuthentication = new StudentTwoFactorVerification();
const verifyOTPForgotPassword = new StudentVerifyOTPForgotPassword();
const otp = new StudentGenerateOTP();
const forgotPass = new StudentForgotPassword();
const resetForgottenPassword = new StudentResetPasswordUsingLink();

const updateProfile = new StudentUpdateProfile();
const changePassword = new StudentChangePassword();

// DISCARDED | NOT USED
// const resetPasswordUsingOtp = new StudentResetPasswordUsingOTP();


const studentController = {
  register: async (req, res) => await registeration.register(req, res),
  login: async (req, res) => await login.loginUser(req, res),
  verifyUser: async (req, res) => await verifyStudent.verify(req, res),
  verifyTwoFactor: async (req, res) => await twoFactorAuthentication.verify(req, res),
  verifyForgotPasswordOTP: async (req, res) => await verifyOTPForgotPassword.verify(req, res),
  generateOTP: async (req, res) => await otp.generate(req, res),
  forgotPassword: async (req, res) => await forgotPass.generateLink(req, res),
  resetPassword: async (req, res) => await resetForgottenPassword.reset(req, res),

  updateProfile: async (req, res) => await updateProfile.update(req, res),
  updatePassword: async (req, res) => await changePassword.change(req, res)
  

  // DISCARDED | NOT USED
  // resetForgottenPassword: async (req, res) => await resetPasswordUsingOtp.reset(req, res),
};

export default studentController;


