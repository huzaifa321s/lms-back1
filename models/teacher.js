import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;

// const experienceSchema = new mongoose.Schema({
//   company: {
//     type: String,
//     required: true,
//   },
//   years: {
//     type: Number,
//     required: true,
//   }
// });



const teacherSchema = new mongoose.Schema({
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
  specialization: {
    type: String,
    default: null,
  },
  qualification: {
    type: String,
    default: null,
  },
  // experience: {
  //   type: [experienceSchema],
  //   // validate: {
  //   //   validator: function (experiences) {
  //   //     return experiences && experiences.length > 0;
  //   //   },
  //   //   message: 'At least one experience must be provided.',
  //   // },
  //   default: [],
  // },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    default: null,
  },
  // city: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'City',
  //   default: null,
  // },
  // state: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'State',
  //   default: null,
  // },
  courses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course', 
    }
  ],
  students: [
    
      {
        type: String,
        ref: 'Student',
      }
    
  ],
  notifications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
    },
  ],
  wallet: {
    type: Number,
    default: 0,
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
    default: true,
  }
}, { timestamps: true });


teacherSchema.pre("save", async function (next) {
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

teacherSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

teacherSchema.methods.getJWTToken = function () {
  const credentials = {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    userType: "teacher"
  }
  return jwt.sign(credentials, SECRET_KEY);
};

const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;
