// Classe
import AdminLogin from "./auth/login.js";
import AdminRegister from "./auth/register.js";
import AdminResetPassword from "./auth/resetpassword.js";
import AdminTwoFactorVerification from "./auth/twofactorverification.js";
import AdminVerifyOTPForgotPassword from "./auth/verifyotp.js";
import AdminForgotPassword from "./auth/forgotpassword.js";
import AdminResetPasswordUsingLink from "./auth/resetpasswordusinglink.js";


const registeration = new AdminRegister();
const login = new AdminLogin();
const twoFactorAuthentication = new AdminTwoFactorVerification();
const verifyOTP = new AdminVerifyOTPForgotPassword();
const resetPassword = new AdminResetPassword();

const forgotPass = new AdminForgotPassword();
const resetForgottenPassword = new AdminResetPasswordUsingLink();

const adminController = {
  register: async (req, res) => await registeration.register(req, res),
  login: async (req, res) => await login.loginUser(req, res),
  verifyTwoFactor: async (req, res) => await twoFactorAuthentication.verify(req, res),
  verifyForgotPasswordOTP: async (req, res) => await verifyOTP.verify(req, res),
  resetForgottenPassword: async (req, res) => await resetPassword.reset(req, res),
  forgotPassword: async (req, res) => await forgotPass.generateLink(req, res),
  resetPassword: async (req, res) => await resetForgottenPassword.reset(req, res),
};

export default adminController;