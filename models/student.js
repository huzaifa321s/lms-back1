import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;

const studentSchema = new mongoose.Schema({
  profile: {
    type: String,
    default: null,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: null,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  dateOfBirth: {
    type: Date,
    validate(value) {
      if (value) {
        const inputDate = value;
        const currentDate = new Date();

        inputDate.setUTCHours(0, 0, 0, 0);
        currentDate.setUTCHours(0, 0, 0, 0);

        if (inputDate > currentDate) {
          throw new Error("Date of birth cannot be in the future");
        }
      }
    },
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  otp: {
    type: String,
    default: null,
  },
  otpGenerateAt: {
    type: Number,
    default: null,
  },
  otpVerified: {
    type: Boolean,
    default: false,
  },
  verifiedUser: {
    type: Boolean,
    default: false,
  },
  twoFactorAuthentication: {
    type: Boolean,
    default: false,
  },
  // enrolledCourses: {
  //   type: [enrolledCourseSchema],
  //   default: []
  // },
  remainingEnrollmentCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    validate: {
      validator: function (value) {
        return ["allowed", "not-allowed"].includes(value);
      },
      message: "Invalid status value",
    },
    default: 'allowed',
  },
  notifications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
    },
  ],
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  customerId: {
    type: String,
    default: null
  },
}, { timestamps: true });




studentSchema.pre("save", async function (next) {
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



studentSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};




studentSchema.methods.getJWTToken = function () {
  const credentials = {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    userType: "student"
  }
  return jwt.sign(credentials, SECRET_KEY);
};

const Student = mongoose.model("Student", studentSchema);
export default Student;