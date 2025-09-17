import moment from 'moment';
import Blog from '../../models/blog.js';
import Teacher from "../../models/teacher.js";
import Student from "../../models/student.js";
import Course from "../../models/course.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import TrainingWheelGame from '../../models/trainingwheelgame.js';
import EnrolledCourses from '../../models/enrolledcourses.js';
import BlogCategory from '../../models/blogcategory.js';
import CourseCategory from '../../models/coursecategory.js';
import GameCategory from '../../models/gamecategory.js';
import stripe from 'stripe';
import { getPlansOverview } from '../../utils/functions/admin/getPlansOverview.js';
import mongoose from 'mongoose';

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);


const dashboardController = {
    getCards: async (req, res) => {
           try {
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalBlogs = await Blog.countDocuments();
    const totalGames = await TrainingWheelGame.countDocuments();

    const allCoursesIDs = (await Course.find({}, { _id: 1 })).map(c => c._id.toString());
    const enrolledValidCourses = await EnrolledCourses.find({ course: { $in: allCoursesIDs } });
    const activeStudentIds = [...new Set(enrolledValidCourses.map(ec => ec.student.toString()))];

    const teachersWithCourses = await Course.distinct('instructor');
    const totalActiveTeachers = teachersWithCourses.length;

    const blogCategories = await BlogCategory.countDocuments();
    const courseCategories = await CourseCategory.countDocuments();
    const gameCategories = await GameCategory.countDocuments();

    const lastWeekStartDate = moment().subtract(1, 'weeks').startOf('week');

    const teachersRegisteredLastWeek = await Teacher.countDocuments({
      createdAt: { $gte: lastWeekStartDate.toDate() }
    });

    const studentsRegisteredLastWeek = await Student.countDocuments({
      createdAt: { $gte: lastWeekStartDate.toDate() }
    });

    return SuccessHandler({
      totalTeachers,
      totalActiveTeachers,
      totalStudents,
      totalActiveStudents: activeStudentIds.length,
      totalCourses,
      totalBlogs,
      totalGames,
      teachersRegisteredLastWeek,
      studentsRegisteredLastWeek,
      courseCategories,
      blogCategories,
      gameCategories,
    }, 200, res, "Got cards!");
  } catch (error) {
    return ErrorHandler("Internal server error", 500, res);
  }
},
getEarnings:async(req,res) =>{
 try {
    const charges = await stripeInstance.charges.list({ limit: 100 });

    const total = charges.data.reduce((sum, c) => sum + c.amount, 0);

    const months = [];
    const earnings = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = moment().subtract(i, "months").startOf("month").unix();
      const endOfMonth = moment().subtract(i, "months").endOf("month").unix();

      const monthCharges = charges.data.filter(
        (c) => c.created >= startOfMonth && c.created <= endOfMonth
      );

      const totalMonth = monthCharges.reduce((sum, c) => sum + c.amount, 0);
      months.push(moment.unix(startOfMonth).format("MMM"));
      earnings.push(totalMonth / 100);
    }

    const startOfMonth = moment().startOf("month").unix();
    const thisMonthCharges = charges.data.filter(c => c.created >= startOfMonth);
    const thisMonth = thisMonthCharges.reduce((sum, c) => sum + c.amount, 0);

    return SuccessHandler({
      totalEarnings: total / 100,
      thisMonthTotalEarnings: thisMonth / 100,
      months,
      earnings,
    }, 200, res, "Got earnings!");
  } catch (error) {
    return ErrorHandler("Internal server error", 500, res);
  }
},
getTopTeachers:async(req,res) =>{
try {
    const topTeachers = await EnrolledCourses.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $group: {
          _id: "$course.instructor",
          totalEnrollments: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "teachers",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: "$teacher" },
      { $sort: { totalEnrollments: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          teacherId: "$_id",
          firstName: "$teacher.firstName",
          lastName: "$teacher.lastName",
          totalEnrollments: 1,
        },
      },
    ]);

    return SuccessHandler(topTeachers, 200, res, "Got top teachers!");
  } catch (error) {
    return ErrorHandler("Internal server error", 500, res);
  }
},
getTopCourses: async (req, res) => {
  try {
const enrolledCourses = await EnrolledCourses.find({}).lean();

  // Step 2: Group by course and count students manually
  const courseCounts = {};
  for (const enrollment of enrolledCourses) {
    const courseId = enrollment.course; // Assuming course is stored as ObjectId or string
    courseCounts[courseId] = (courseCounts[courseId] || 0) + 1;
  }

  // Step 3: Convert to array and sort by studentsCount, limit to 5
  const sortedCourses = Object.entries(courseCounts)
    .map(([courseId, studentsCount]) => ({ courseId, studentsCount }))
    .sort((a, b) => b.studentsCount - a.studentsCount)
    .slice(0, 5);
console.log('sortedCourses ===>',sortedCourses)
  // Step 4: Fetch course details for the top 5 course IDs
  const courseIds = sortedCourses.map(item => new  mongoose.Types.ObjectId(item.courseId));
  console.log('courseIds ===>',courseIds)
  const courseDetails = await Course.find({ _id: { $in: courseIds } });
console.log('courseDetails ===>',courseDetails)
  // Step 5: Map course details to the final result
  const result = sortedCourses.map(item => {
    
    const course = courseDetails.find(c => c._id.toString() === item.courseId);
    console.log('item ===>',item)
    return {
      courseID: item.courseId,
      title: course ? course.name : null,
      description: course ? course.description : null,
      studentsCount: item.studentsCount
    };
  });
  const topCourses = result;
console.log('topCourses ===>',topCourses)
    return SuccessHandler(topCourses, 200, res, "Got top courses!");
  } catch (error) {
    console.error("Error in getTopCourses:", error);
    return ErrorHandler("Internal server error", 500, res);
  }
},

    getRegistrationsLastWeek: async (req, res) => {
        try {
            // Calculate the start date of last week
            const lastWeekStartDate = moment().subtract(1, 'weeks').startOf('week');

            // Get students registered last week
            const studentsRegisteredLastWeek = await Student.find({
                createdAt: { $gte: lastWeekStartDate.toDate() }
            });

            // Get teachers registered last week
            const teachersRegisteredLastWeek = await Teacher.find({
                createdAt: { $gte: lastWeekStartDate.toDate() }
            });

            return SuccessHandler({
                studentsRegisteredLastWeek,
                teachersRegisteredLastWeek
            }, 200, res, `Got registrations from last week!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getPlans:async(req,res) =>{
  try {
    const plansOverview = await getPlansOverview();

    return SuccessHandler(plansOverview, 200, res, "Got plans overview!");
  } catch (error) {
    return ErrorHandler("Internal server error", 500, res);
  }
    },

    analyzeTopCourses: async (req, res) => {
        try {
            // Fetch all courses
            const courses = await Course.find();

            // Sort courses by creation date
            courses.sort((a, b) => a.createdAt - b.createdAt);

            // Iterate over courses to count the number of students enrolled
            const coursesWithEnrollmentCounts = await Promise.all(courses.map(async course => {
                const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
                return { course, enrollmentCount };
            }));

            // Sort courses by enrollment count
            coursesWithEnrollmentCounts.sort((a, b) => b.enrollmentCount - a.enrollmentCount);

            // Return the top 10 courses
            const topCourses = coursesWithEnrollmentCounts.slice(0, 10);

            return SuccessHandler({
                topCourses
            }, 200, res, `Top 10 courses analyzed successfully!`);
        } catch (error) {
            console.error("Error analyzing top courses:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }


    // // Maybe consider later
    // monthlyActiveUsers: async (req, res) => {
    //     try {
    //         // Calculate the start date of the current month
    //         const startDate = moment().startOf('month');

    //         // Find users who logged in this month
    //         const monthlyActiveUsers = await User.countDocuments({
    //             lastLogin: { $gte: startDate.toDate() }
    //         });

    //         res.json({ monthlyActiveUsers });
    //     } catch (error) {
    //         console.error("Error fetching monthly active users:", error);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }
};

export default dashboardController;
