import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;

const adminSchema = new mongoose.Schema({
  profile: {
    type: String,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
  },
  otpGenerateAt: {
    type: Number,
    default: null,
  },
  otpVerified: {
    type: Boolean,
    default: false,
  },
  twoFactorAuthentication: {
    type: Boolean,
    default: false,
  },
});


adminSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

adminSchema.methods.getJWTToken = function () {
  const credentials = {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    userType: "admin"
  }
  return jwt.sign(credentials, SECRET_KEY);
};

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
