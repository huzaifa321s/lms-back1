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
            const lastWeekStartDate = moment().subtract(1, 'weeks').startOf('week');

            let courseIds = await Course.find({ instructor: req.user._id }, { _id: 1 }).lean().exec();
            courseIds = courseIds.map(c => c._id);

            const myCoursesCount = courseIds.length;

            const enrolledStudentsCount = await EnrolledCourses.distinct('student', {
                course: {
                    $in: courseIds
                }
            }).then(students => students.length);

            const studentsEnrolledThisWeek = await EnrolledCourses.distinct('student', {
                course: { $in: courseIds },
                createdAt: { $gte: lastWeekStartDate }
            }).then(students => students.length);

            const teacherWallet = await TeacherWallet.findOne({ teacher: req.user._id }).lean().exec();
            const points = teacherWallet?.points || 0;

            return SuccessHandler({ points, myCoursesCount, enrolledStudentsCount, studentsEnrolledThisWeek }, 200, res, `Got cards!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    coursesByStudents: async (req, res) => {
        try {
            const courses = await Course.find({
                instructor: req.user._id
            }).lean().exec();

            const courseLabels = courses.map((c) => c.name);

            const studentsCount = [];
            for (const c of courses) {
                const distinctStudents = await EnrolledCourses.distinct('student', { course: c._id });
                studentsCount.push(distinctStudents.length);
            }

            const borderColor = courses.map((c) => c.color);
            const backgroundColor = courses.map((c) => c.color.replace('1)', '0.8)'));
            const dounutData = { courseLabels, studentsCount, borderColor, backgroundColor };
            console.log('dounutData ====>', dounutData)
            return SuccessHandler(dounutData, 200, res, `Course by Students!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    monthlyEnrolledStudents: async (req, res) => {
        try {
            const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate();

            let courseIds = await Course.find({
                instructor: req.user._id
            }, {
                _id: 1
            }).lean().exec();

            courseIds = courseIds.map(c => c._id);

            const enrollCountByMonth = await EnrolledCourses.aggregate([
                {
                    $match: {
                        course: {
                            $in: courseIds
                        },
                        createdAt: {
                            $gte: sixMonthsAgo
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            month: {
                                $month: "$createdAt"
                            },
                            year: {
                                $year: "$createdAt"
                            },
                            student: "$student"
                        },
                        studentsCount: {
                            $sum: 1
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            month: "$_id.month",
                            year: "$_id.year"
                        },
                        studentsCount: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        "_id.year": 1,
                        "_id.month": 1
                    }
                }
            ]);

            // Get the past six months' names and initialize monthlyCounts
            const pastSixMonths = [];
            const monthlyCounts = [];

            for (let i = 5; i >= 0; i--) {
                const date = moment().subtract(i, 'months');
                pastSixMonths.push(date.format('MMMM YYYY')); // Format month name and year
                monthlyCounts.push(0); // Initialize with 0
            }

            enrollCountByMonth.forEach(item => {
                const i = pastSixMonths.findIndex(m => {
                    const [month, year] = m.split(' ');
                    return moment.months().indexOf(month) + 1 === item._id.month && parseInt(year) === item._id.year;
                });

                if (i !== -1) monthlyCounts[i] = item.studentsCount;
            });

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