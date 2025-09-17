import stripe from "stripe";
import mongoose from "mongoose";
import Student from "../../models/student.js";
import Subscription from "../../models/subscription.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import { getStudentActivePlan, planDetails } from "../../utils/functions/HelperFunctions.js";
import EnrolledCourses from "../../models/enrolledcourses.js";
import Course from "../../models/course.js";

const studentController = {

    get: async (req, res) => {
        const { page, q } = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 8; // Set a default page size of 8
        const skip = (pageNumber - 1) * itemsPerPage;

        try {
            let studentQuery = {};
            if (q) {
                let conditions = [];
                const searchTerms = q.split(" ");
                searchTerms.forEach(term => {
                    const condition = {
                        $or: [
                            { firstName: { $regex: term, $options: "i" } },
                            { lastName: { $regex: term, $options: "i" } }
                        ]
                    };
                    conditions.push(condition);
                });

                if (conditions.length !== 0) studentQuery = { $and: conditions };
            }

            const totalStudents = await Student.countDocuments(studentQuery);
            const totalPages = Math.ceil(totalStudents / itemsPerPage);
            const students = await EnrolledCourses.aggregate([
                // Join Students
                {
                    $lookup: {
                        from: "students",
                        localField: "student",
                        foreignField: "_id",
                        as: "studentInfo",
                    },
                },

                {
                    $match: { q }
                },
                { $unwind: "$studentInfo" },

                // Join Subscriptions
                {
                    $lookup: {
                        from: "subscriptions",
                        localField: "studentInfo.subscriptionId",
                        foreignField: "_id",
                        as: "subscriptionInfo",
                    },
                },
                { $unwind: { path: "$subscriptionInfo", preserveNullAndEmptyArrays: true } },

                // Join Courses
                {
                    $lookup: {
                        from: "courses",
                        localField: "course",
                        foreignField: "_id",
                        as: "courseInfo",
                    },
                },

                // Group by student
                {
                    $group: {
                        _id: "$student",
                        name: {
                            $first: {
                                $concat: ["$studentInfo.firstName", " ", "$studentInfo.lastName"]
                            }
                        },
                        phone: { $first: "$studentInfo.phone" },
                        bio: { $first: "$studentInfo.bio" },
                        email: { $first: "$studentInfo.email" },
                        profile: { $first: "$studentInfo.profile" },
                        subscriptionPriceId: { $first: "$subscriptionInfo.priceId" },
                        subscriptionStatus: { $first: "$subscriptionInfo.status" },
                        allCourses: { $push: "$courseInfo" },
                    },
                },

                // Project final fields and planActive
                {
                    $project: {
                        name: 1,
                        email: 1,
                        phone: 1,
                        bio: 1,
                        profile: 1,
                        subscriptionPriceId: 1,
                        subscriptionStatus: 1,
                        coursesCount: {
                            $size: {
                                $reduce: {
                                    input: "$allCourses",
                                    initialValue: [],
                                    in: { $concatArrays: ["$$value", "$$this"] },
                                },
                            },
                        },
                        courseIds: {
                            $map: {
                                input: {
                                    $reduce: {
                                        input: "$allCourses",
                                        initialValue: [],
                                        in: { $concatArrays: ["$$value", "$$this"] },
                                    },
                                },
                                as: "course",
                                in: "$$course._id",
                            },
                        },
                        planActive: {
                            $and: [
                                { $ne: ["$subscriptionPriceId", null] },
                                { $eq: ["$subscriptionStatus", "active"] },
                            ],
                        },
                        plan: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$subscriptionPriceId", process.env.DAILY_PRICE_ID] }, then: "Daily" },
                                    { case: { $eq: ["$subscriptionPriceId", process.env.BRONZE_PRICE_ID] }, then: "Bronze" },
                                    { case: { $eq: ["$subscriptionPriceId", process.env.SILVER_PRICE_ID] }, then: "Silver" },
                                    { case: { $eq: ["$subscriptionPriceId", process.env.GOLD_PRICE_ID] }, then: "Gold" },
                                ],
                                default: null,
                            },
                        },
                    },
                },

                { $sort: { name: 1 } },
                // Apply pagination
                { $skip: skip },
                { $limit: itemsPerPage }
            ]);









            return SuccessHandler({ students, totalPages }, 200, res, `Students retrieved!`);
        } catch (error) {
            console.error("Error retrieving:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getStudent: async (req, res) => {
        const id = req.params.id;
        try {
            if (!id) return ErrorHandler('Id is required!', 400, res);

            const student = await Student.findById(id);

            if (!student) return ErrorHandler('Student does not exist', 400, res);

            const activePlan = await getStudentActivePlan(student.subscriptionId);

            return SuccessHandler({ student, activePlan }, 200, res, `Student with id: ${id}, retrieved!`);
        } catch (error) {
            console.error("Error retrieving:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getStudentWithEnrolledCourses: async (req, res) => {
        const id = req.params.id;        
        console.log('id ===>',id)
        try {
            if (!id) return ErrorHandler('ID is requried', 400, res);
        
         const mongooseId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
const student = await EnrolledCourses.aggregate([
  // Match student by ID
  {
    $match: { student: new mongoose.Types.ObjectId(id) },
  },

  // Join student info
  {
    $lookup: {
      from: "students",
      localField: "student",
      foreignField: "_id",
      as: "studentInfo",
    },
  },
  { $unwind: "$studentInfo" },

  // Join subscription info
  {
    $lookup: {
      from: "subscriptions",
      localField: "studentInfo.subscriptionId",
      foreignField: "_id",
      as: "subscriptionInfo",
    },
  },
  { $unwind: { path: "$subscriptionInfo", preserveNullAndEmptyArrays: true } },

  // Join course info (array, no unwind yet)
  {
    $lookup: {
      from: "courses",
      localField: "course",
      foreignField: "_id",
      as: "courseInfo",
    },
  },

  // Group by student
  {
    $group: {
      _id: "$student",
      name: {
        $first: {
          $concat: ["$studentInfo.firstName", " ", "$studentInfo.lastName"],
        },
      },
      email: { $first: "$studentInfo.email" },
      phone: { $first: "$studentInfo.phone" },
      bio: { $first: "$studentInfo.bio" },
      profile: { $first: "$studentInfo.profile" },
      subscriptionPriceId: { $first: "$subscriptionInfo.priceId" },
      subscriptionStatus: { $first: "$subscriptionInfo.status" },

      // Push only valid courses
      enrolledCourses: {
        $push: {
          $cond: [
            { $gt: [{ $size: "$courseInfo" }, 0] }, // only if course exists
            {
              _id: { $arrayElemAt: ["$courseInfo._id", 0] },
              name: { $arrayElemAt: ["$courseInfo.name", 0] },
              enrolledAt: "$createdAt",
            },
            "$$REMOVE", // skip if no course
          ],
        },
      },
    },
  },

  // Add computed plan + active status
  {
    $addFields: {
      planActive: {
        $and: [
          { $ne: ["$subscriptionPriceId", null] },
          { $eq: ["$subscriptionStatus", "active"] },
        ],
      },
      plan: {
        $switch: {
          branches: [
            {
              case: { $eq: ["$subscriptionPriceId", process.env.DAILY_PRICE_ID] },
              then: "Daily",
            },
            {
              case: { $eq: ["$subscriptionPriceId", process.env.BRONZE_PRICE_ID] },
              then: "Bronze",
            },
            {
              case: { $eq: ["$subscriptionPriceId", process.env.SILVER_PRICE_ID] },
              then: "Silver",
            },
            {
              case: { $eq: ["$subscriptionPriceId", process.env.GOLD_PRICE_ID] },
              then: "Gold",
            },
          ],
          default: null,
        },
      },
    },
  },
]);





            console.log('student ===>',student)
            return SuccessHandler(student, 200, res, 'Student with details retrieved successfully');

        } catch (error) {
            console.log('error', error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getEnrolledCourses: async (req, res) => {
        const { studentId, page, q, countDocs } = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 4; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;
        console.log('countDocs ===>', countDocs)

        try {

            if (countDocs) {
                const enrolledCoursesCount = await EnrolledCourses.countDocuments({ student: studentId })
                console.log('enrolledCoursesCount ===>', enrolledCoursesCount)
            }

            // Find the enrolled courses for the user
            const enrolledCourses = await EnrolledCourses.find({
                student: studentId
            }).select('course createdAt');

            // Extract course IDs from the enrolled courses
            const courseIds = enrolledCourses.map(enrolled => enrolled.course);

            // Construct the query for searching courses
            let query = { _id: { $in: courseIds } };

            if (q) {
                query.name = { $regex: q, $options: "i" };
            }

            // Get the total count of matching courses for pagination
            const totalCourses = await Course.countDocuments(query);
            const totalPages = Math.ceil(totalCourses / itemsPerPage);

            // Apply the search query and pagination to the courses
            const courses = await Course.find(query)
                .select('name description category instructor createdAt')
                .populate({ path: 'category', select: 'name' })
                .populate({ path: "instructor", select: "firstName lastName" })
                .skip(skip)
                .limit(itemsPerPage);

            // Prepare the response data
            const myEnrolledCourses = courses.map(course => ({
                _id: course._id,
                name: course.name,
                description: course.description,
                category: course.category.name,
                instructor: `${course.instructor.firstName} ${course.instructor.lastName}`,
                enrolledDate: enrolledCourses.find((ec) => {
                    if (ec.course.toString() === course._id.toString()) {
                        return ec
                    }
                })?.createdAt,
            }));

            return SuccessHandler({ courses: myEnrolledCourses, totalPages }, 200, res, `Enrolled courses retrieved!`);
        } catch (error) {
            console.error("Error retrieving courses:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }

};

export default studentController;