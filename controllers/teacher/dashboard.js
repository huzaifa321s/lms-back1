import moment from 'moment';
import Course from "../../models/course.js";
import TeacherWallet from "../../models/teacherwallet.js";
import EnrolledCourses from '../../models/enrolledcourses.js';
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import Teacher from '../../models/teacher.js';

const dashboardController = {
    getCreds: async (req, res) => {
        try {
            
          const id = req.user._id;
          const teacher = await Teacher.findById(id);
          console.log('teacher ===>',teacher)
          if(!teacher) return ErrorHandler('Teacher not found', 400, res);
          return SuccessHandler(teacher, 200, res, `Got creds!`);
        } catch (error) {
            console.log('error', error)
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getCards: async (req, res) => {
        try {
           const lastWeekStartDate = moment().subtract(1, 'weeks').startOf('week')

// get courseIds
const courseIds = (
  await Course.find({ instructor: req.user._id }, { _id: 1 }).lean()
).map(c => c._id)

const myCoursesCount = courseIds.length

// enrolled counts
const [enrolledStudentsCount, studentsEnrolledThisWeek] = await Promise.all([
  EnrolledCourses.countDocuments({ course: { $in: courseIds } }),
  EnrolledCourses.countDocuments({
    course: { $in: courseIds },
    createdAt: { $gte: lastWeekStartDate }
  })
])

// wallet points
const points = (await TeacherWallet.findOne({ teacher: req.user._id }).lean())?.points || 0


            return SuccessHandler({ points, myCoursesCount, enrolledStudentsCount, studentsEnrolledThisWeek }, 200, res, `Got cards!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    coursesByStudents: async (req, res) => {
        try {
           const courses = await Course.find({ instructor: req.user._id }).lean()

const courseLabels = courses.map(c => c.name)
const borderColor = courses.map(c => c.color)
const backgroundColor = courses.map(c => c.color.replace('1)', '0.8)'))

// parallel distinct queries
const studentsCount = await Promise.all(
  courses.map(c =>
    EnrolledCourses.countDocuments({ course: c._id })
  )
)

const dounutData = { courseLabels, studentsCount, borderColor, backgroundColor }
console.log('dounutData ====>', dounutData)

            return SuccessHandler(dounutData, 200, res, `Course by Students!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    monthlyEnrolledStudents: async (req, res) => {
        try {
           const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate()

// get course ids
const courseIds = (
  await Course.find({ instructor: req.user._id }, { _id: 1 }).lean()
).map(c => c._id)

// aggregate enrollments by month
const enrollCountByMonth = await EnrolledCourses.aggregate([
  {
    $match: {
      course: { $in: courseIds },
      createdAt: { $gte: sixMonthsAgo }
    }
  },
  {
    $group: {
      _id: {
        month: { $month: "$createdAt" },
        year: { $year: "$createdAt" }
      },
      studentsCount: { $addToSet: "$student" } // unique students
    }
  },
  {
    $project: {
      _id: 1,
      studentsCount: { $size: "$studentsCount" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])

// last 6 months labels
const pastSixMonths = Array.from({ length: 6 }, (_, i) =>
  moment().subtract(5 - i, 'months').format('MMMM YYYY')
)

// initialize counts
const monthlyCounts = pastSixMonths.map(label => {
  const [month, year] = label.split(' ')
  const found = enrollCountByMonth.find(
    item =>
      moment.months()[item._id.month - 1] === month &&
      item._id.year === parseInt(year)
  )
  return found ? found.studentsCount : 0
})


            return SuccessHandler({ monthlyCounts, pastSixMonths }, 200, res, `Student enrollment by month!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }

};

export default dashboardController;



// ----------------------------------------- WITH DUPLICATIONS
// getCards: async (req, res) => {
//     try {

//         const lastWeekStartDate = moment().subtract(1, 'weeks').startOf('week');

//         let courseIds = await Course.find({ instructor: req.user._id }, { _id: 1 }).lean().exec();
//         courseIds = courseIds.map(c => c._id);

//         const myCoursesCount = courseIds.length;
//         const enrolledStudentsCount = await EnrolledCourses.countDocuments({ course: { $in: courseIds } });
//         const studentsEnrolledThisWeek = await EnrolledCourses.countDocuments({ course: { $in: courseIds }, createdAt: { $gte: lastWeekStartDate } });

//         return SuccessHandler({ myCoursesCount, enrolledStudentsCount, studentsEnrolledThisWeek }, 200, res, `Got cards!`);
//     } catch (error) {
//         console.error("Error:", error);
//         return ErrorHandler('Internal server error', 500, res);
//     }
// },




// ----------------------------------------- COURSE BY STUDENTS (WITH DUPLICATIONS)
// coursesByStudents: async (req, res) => {
//     try {
//         const courses = await Course.find({
//             instructor: req.user._id
//         }).lean().exec();

//         const courseLabels = courses.map((c) => c.name);


//         const studentsCount = [];
//         for (const c of courses) {
//             studentsCount.push(await EnrolledCourses.countDocuments({ course: c._id }));
//         }

//         const borderColor = courses.map((c) => c.color);
//         const backgroundColor = courses.map((c) => c.color.replace('1)', '0.8)'));

//         const dounutData = { courseLabels, studentsCount, borderColor, backgroundColor }

//         return SuccessHandler(dounutData, 200, res, `Course by Students!`);
//     } catch (error) {
//         console.error("Error:", error);
//         return ErrorHandler('Internal server error', 500, res);
//     }
// },

// ----------------------------------------- MONTHLY ENROLLED STUDENTS (WITH DUPLICATIONS)
// monthlyEnrolledStudents: async (req, res) => {
//     try {

//         let courseIds = await Course.find({ instructor: req.user._id }, { _id: 1 }).lean().exec();
//         courseIds = courseIds.map(c => c._id)

//         const enrollCountByMonth = await EnrolledCourses.aggregate([
//             { $match: { course: { $in: courseIds } } },
//             {
//                 $group: {
//                     _id: {
//                         month: {
//                             $month: "$createdAt"
//                         }
//                     },
//                     count: {
//                         $sum: 1
//                     }
//                 }
//             },
//             { $sort: { "_id.month": 1 } }
//         ]);

//         // Create an array with 12 elements initialized to 0
//         const monthlyCounts = Array(12).fill(0);

//         enrollCountByMonth.forEach(item => {
//             monthlyCounts[item._id.month - 1] = item.count;
//         });

//         console.log(monthlyCounts);

//         return SuccessHandler(monthlyCounts, 200, res, `Student enrollemnet by month!`);
//     } catch (error) {
//         console.error("Error:", error);
//         return ErrorHandler('Internal server error', 500, res);
//     }
// }


// ----------------------------------------- MONTHLY ENROLLED STUDENTS (WITHOUT DUPLICATIONS)
// monthlyEnrolledStudents: async (req, res) => {
//     try {
//         let courseIds = await Course.find({ instructor: req.user._id }, { _id: 1 }).lean().exec();
//         courseIds = courseIds.map(c => c._id);

//         const enrollCountByMonth = await EnrolledCourses.aggregate([
//             { $match: { course: { $in: courseIds } } },
//             {
//                 $group: {
//                     _id: {
//                         month: { $month: "$createdAt" },
//                         student: "$student"
//                     },
//                     count: { $sum: 1 }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id.month",
//                     count: { $sum: 1 }
//                 }
//             },
//             { $sort: { "_id": 1 } }
//         ]);

//         // Create an array with 12 elements initialized to 0
//         const monthlyCounts = Array(12).fill(0);

//         enrollCountByMonth.forEach(item => {
//             monthlyCounts[item._id - 1] = item.count;
//         });

//         console.log(monthlyCounts);

//         return SuccessHandler(monthlyCounts, 200, res, `Student enrollment by month!`);
//     } catch (error) {
//         console.error("Error:", error);
//         return ErrorHandler('Internal server error', 500, res);
//     }
// }