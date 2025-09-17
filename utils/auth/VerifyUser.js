import ErrorHandler from "../functions/ErrorHandler.js";
import SuccessHandler from "../functions/SuccessHandler.js";
// 
//  {
//     _id: new ObjectId('68905d310c43b06a7cb255ab'),
//     name: 'smart last name',
//     phone: null,
//     bio: 'sdfa',
//     email: 'smart@gmail.com',
//     profile: '[object FileList]',
//     subscriptionPriceId: 'price_1PUXjiEdtHnRsYCMTMgc8M7S',
//     subscriptionStatus: 'active',
//     coursesCount: 0,
//     courseIds: [],
//     planActive: true,
//     plan: 'Daily'
//   }



//       const students = await Student.find(searchQuery).skip(itemsPerPage)
//       const studentsEnrolled = [];

//       for (let i = 0; i < students.length; i++) {
//         studentsEnrolled.push(... await EnrolledCourses.find({ student: students[i]._id }))
//       }

// {
//     _id: new ObjectId('689c24239d6132e66f078324'),
//     profile: '[object FileList]',
//     bio: 'sdfa',
//     email: 'test@example.com',
//     phone: null,
//     name: 'Test First Name Test Last Name',
//     subscriptionPriceId: 'price_1P6eq0EdtHnRsYCMGORU2F9n',
//     subscriptionStatus: 'active',
//     enrolledCourses: [ [Object], [Object] ],
//     planActive: true,
//     plan: 'Silver'
//   }
//       const result = [];

//       const map = new Map();

//       for (const e of studentsEnrolled) {

//         if (!map.has(e.student.toString())) {
//           map.set(e.student.toString(), new Set());
//         }
//         map.get(e.student.toString()).add(e.course.toString());
//       }
// console.log('students ===>',students)
//       // ab map se result nikalo
//       for (const [index,[student, courses]] of Array.from(map.entries()).entries()) {
//         result.push({
//           student: new mongoose.Types.ObjectId(student),
//           uniqueCourses: [...courses],
//           coursesCount: courses.size,
//           bio:students[index].bio,
//           plan:students[index].plan,
//           phone:students[index].phone,
//           profile:students[index].profile
//         });
//       }

//       console.log(result);
// 
class VerifyUser {
  userType = "<User Type>";
  checkTokenExpiryFlag = true;
  expiryTimeInMinutes = 2

  constructor(userModel) {
    this.userModel = userModel;
  }

  async verify(req, res) {
    const userData = req.body;
    try {
      const validationErrorMessage = this.validateFields(userData);
      if (validationErrorMessage) return ErrorHandler(validationErrorMessage, 400, res);

      const user = await this.checkUserExist(userData);
      if (!user) return ErrorHandler(`${this.userType} not found`, 400, res);

      if (this.alreadyVerfied(user)) return ErrorHandler(`Already verified!`, 400, res);


      if(this.checkTokenExpiryFlag) {
        const expiredToken = this.checkTokenExpiry(user)
        if (expiredToken) return ErrorHandler(`Token is expired, generate again`, 400, res);
    }

      const userVerified = this.verifyOTP(user, userData.otp);

      if (userVerified) {
        const credentials = this.getCredentials(user);
        const token = await user.getJWTToken();
        return SuccessHandler({ credentials, token }, 200, res, `${this.userType} verified and logged in successfully!`);
      } else {
        return ErrorHandler("Invalid OTP!", 400, res);
      }

    } catch (error) {
      console.error(`Error verifying ${this.userType}:`, error);
      return ErrorHandler("Iternal server error", 500, res);
    }
  }

  validateFields(fields) {
    const requiredFields = ['email', 'otp'];
    const missingFields = requiredFields.filter(f => !fields[f]);

    let errorMessage = "";
    if (missingFields.length > 0) {
      errorMessage = `Please provide required fields: ${missingFields.join(', ')}.`;
      return errorMessage;
    }

    return null;
  }

  async checkUserExist(user) {
    const { email } = user;
    return await this.userModel.findOne({ email });
  }

  alreadyVerfied(user) {
    return user.verifiedUser;
  }

  checkTokenExpiry(user) {
    const currentTime = new Date()
    const genrationTime = new Date(user.otpGenerateAt)

    console.log("currentTime", currentTime)
    console.log("genrationTime", genrationTime)

    const expiredIn = this.expiryTimeInMinutes * 60000; // mins
    const timeDifference =  currentTime.getTime() - genrationTime.getTime();


    console.log("expiry time --> ", this.expiryTimeInMinutes)

    console.log("timeDifference", timeDifference)
    console.log("currentTime.getTime()", currentTime.getTime())

    const timeDifferenceInMinutes = timeDifference / 60000; // convert milliseconds to minutes

    console.log("timeDifferenceInMinutes", timeDifferenceInMinutes);

    if (timeDifference > expiredIn) {
      return true
    }

    return false
  }

  async verifyOTP(user, otp) {
    if (user.otp === otp) {
      user.otp = null;
      user.otpGenerateAt = null;
      user.verifiedUser = true;

      await user.save();

      return true
    } else {
      return false
    }
  }


  getCredentials(user) {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }
}


export default VerifyUser;
