import moment from 'moment';
import Course from "../../models/course.js";
import TeacherWallet from "../../models/teacherwallet.js";
import EnrolledCourses from '../../models/enrolledcourses.js';
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";

const dashboardController = {

getCards: async (req, res) => {
  try {
    const { user } = req;

    // Inline input validation
    if (!user) {
      return ErrorHandler("Unauthorized or missing user", 401, res);
    }

    const lastWeekStartDate = moment().subtract(1, 'weeks').startOf('week');
    const courseIds = (await Course.find({ instructor: user._id }, { _id: 1 }).lean()).map(c => c._id);

    // Fetch counts and wallet concurrently
    const [enrolledStudentsCount, studentsEnrolledThisWeek, teacherWallet] = await Promise.all([
      EnrolledCourses.distinct('student', { course: { $in: courseIds } }).then(s => s.length),
      EnrolledCourses.distinct('student', {
        course: { $in: courseIds },
        createdAt: { $gte: lastWeekStartDate },
      }).then(s => s.length),
      TeacherWallet.findOne({ teacher: user._id }, 'points').lean(),
    ]);

    return SuccessHandler({
      points: teacherWallet?.points || 0,
      myCoursesCount: courseIds.length,
      enrolledStudentsCount,
      studentsEnrolledThisWeek,
    }, 200, res, "Cards retrieved successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},


    coursesByStudents: async (req, res) => {
  try {
    const { user } = req;

    // Inline input validation
    if (!user) {
      return ErrorHandler("Unauthorized or missing user", 401, res);
    }

    // Fetch courses and student counts concurrently
    const courses = await Course.find({ instructor: user._id }, 'name color').lean();
    const studentsCount = await Promise.all(
      courses.map(c => EnrolledCourses.distinct('student', { course: c._id }).then(s => s.length))
    );

    // Prepare donut chart data
    const donutData = {
      courseLabels: courses.map(c => c.name),
      studentsCount,
      borderColor: courses.map(c => c.color),
      backgroundColor: courses.map(c => c.color.replace('1)', '0.8)')),
    };

    return SuccessHandler(donutData, 200, res, "Courses by students retrieved successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},

  monthlyEnrolledStudents: async (req, res) => {
  try {
    const { user } = req;

    // Inline input validation
    if (!user) {
      return ErrorHandler("Unauthorized or missing user", 401, res);
    }

    const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate();
    const courseIds = (await Course.find({ instructor: user._id }, '_id').lean()).map(c => c._id);

    // Aggregate enrollment counts by month
    const enrollCountByMonth = await EnrolledCourses.aggregate([
      { $match: { course: { $in: courseIds }, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, studentsCount: { $addToSet: '$student' } } },
      { $project: { _id: 1, studentsCount: { $size: '$studentsCount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Generate past 6 months labels and counts
    const pastSixMonths = [...Array(6)].map((_, i) => moment().subtract(5 - i, 'months').format('MMMM YYYY'));
    const monthlyCounts = pastSixMonths.map(m => {
      const [monthName, year] = m.split(' ');
      const monthIdx = moment().month(monthName).month() + 1;
      const found = enrollCountByMonth.find(e => e._id.month === monthIdx && e._id.year === +year);
      return found ? found.studentsCount : 0;
    });

    return SuccessHandler({ monthlyCounts, pastSixMonths }, 200, res, "Monthly student enrollment retrieved successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},


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