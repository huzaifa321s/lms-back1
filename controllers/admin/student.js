import mongoose from "mongoose";
import Student from "../../models/student.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import { getStudentActivePlan } from "../../utils/functions/HelperFunctions.js";
import EnrolledCourses from "../../models/enrolledcourses.js";

const studentController = {

  get: async (req, res) => {
    try {
      const { page = 1, q } = req.query;
      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const itemsPerPage = parseInt(process.env.PAGE_SIZE, 10) || 8;

      // Input validation & sanitization
      if (q && typeof q !== "string") return ErrorHandler("Invalid query", 400, res);

      let searchQuery = {};
      if (q && q.trim()) {
        searchQuery = {
          $or: [
            { "studentInfo.firstName": new RegExp(q.trim(), "i") },
            { "studentInfo.lastName": new RegExp(q.trim(), "i") }
          ]
        };
      }

      const studentsAgg = await Student.aggregate([
        {
          $match: searchQuery
        },
        {
          $lookup: {
            from: "enrolledcourses",
            localField: "_id",
            foreignField: "student",
            as: "enrollments"
          }
        },
        {
          $lookup: {
            from: "subscriptions",
            localField: "subscriptionId",
            foreignField: "_id",
            as: "subscriptionInfo"
          }
        },
        { $unwind: { path: "$subscriptionInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $concat: ["$firstName", " ", "$lastName"] },
            phone: 1,
            bio: 1,
            email: 1,
            profile: 1,
            subscriptionPriceId: "$subscriptionInfo.priceId",
            subscriptionStatus: "$subscriptionInfo.status",
            courseIds: {
              $map: {
                input: "$enrollments",
                as: "enr",
                in: "$$enr.course"
              }
            },
            coursesCount: { $size: "$enrollments" },
            planActive: { $eq: ["$subscriptionInfo.status", "active"] },
            plan: {
              $switch: {
                branches: [
                  { case: { $eq: ["$subscriptionInfo.priceId", process.env.DAILY_PRICE_ID] }, then: "Daily" },
                  { case: { $eq: ["$subscriptionInfo.priceId", process.env.BRONZE_PRICE_ID] }, then: "Bronze" },
                  { case: { $eq: ["$subscriptionInfo.priceId", process.env.SILVER_PRICE_ID] }, then: "Silver" },
                  { case: { $eq: ["$subscriptionInfo.priceId", process.env.GOLD_PRICE_ID] }, then: "Gold" },
                ],
                default: "N/A",
              }
            }
          }
        },
        { $sort: { name: 1 } },
        { $skip: (pageNumber - 1) * itemsPerPage },
        { $limit: itemsPerPage }
      ]);
      const normalized = studentsAgg.map(student => ({
        ...student,
        subscriptionPriceId: student.subscriptionPriceId?.priceId || null,
        subscriptionStatus: student.subscriptionId?.status || ''
      }));

      console.log(normalized);
      const totalCount = await Student.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalCount / itemsPerPage);
      console.log('studentsAgg ==', studentsAgg)
      return SuccessHandler(
        { students: normalized, totalPages },
        200,
        res,
        "Students retrieved!"
      );

    } catch (error) {
      return ErrorHandler("Failed to retrieve students", 500, res, error);
    }
  },

  getStudent: async (req, res) => {
    try {
      let { id } = req.params;

      // Simple validation
      if (!id) {
        return ErrorHandler("Valid student ID required!", 400, res);
      }
      console.log('id ===>', id)

      // Fetch student
      const student = await Student.findById(new mongoose.Types.ObjectId(id))
        .select("firstName lastName email phone bio profile subscriptionId")
        .lean();
      console.log('student  ====>', student)
      if (!student) return ErrorHandler("Student does not exist", 404, res);

      // Get active plan
      const activePlan = await getStudentActivePlan(student.subscriptionId);

      return SuccessHandler({ student, activePlan }, 200, res, `Student with id: ${id}, retrieved!`);
    } catch (error) {
      return ErrorHandler("Internal server error", 500, res, error);
    }
  },
  getStudentsStatus: async (req, res) => {
    try {
      let allStudents = await Student.find({}).select('_id');
      console.log('allStudents ===>', allStudents.length);
      if (allStudents?.length > 0) {
        allStudents = allStudents.map((as => as._id.toString()));
      }
      let activeStudents = await EnrolledCourses.find({ student: { $in: allStudents } }).select('student').lean();
      activeStudents = [...new Map(activeStudents.map(item => [item.student.toString()])).values()]
      return SuccessHandler({ total: allStudents.length || 0, active: activeStudents?.length || 0, inActive: allStudents.length - activeStudents?.length }, 200, res, `Course updated!`);
    } catch (error) {
      console.log('error', error);
      return ErrorHandler('Internal server error', 500, res);
    }
  },
  getStudentWithEnrolledCourses: async (req, res) => {
    const id = req.params.id;
    try {
      if (!id) return ErrorHandler('ID is requried', 400, res);

      const student = await Student.findOne({ _id: id })
        .select('bio email phone profile firstName lastName _id subscriptionId')
        .populate({ path: 'subscriptionId', select: 'priceId status' })
        .lean();

      if (!student) throw new Error('Student not found');
      if (student.subscriptionId) {
        student.subscriptionPriceId = student.subscriptionId.priceId
        student.subscriptionStatus = student.subscriptionId.status
        student.courseIds = (await EnrolledCourses.find({ student: id }).select('course'))?.map((c => c.course));
      }
      student.enrolledCourses = [...await EnrolledCourses.find({ student: id }).populate('course')]
      if (student.enrolledCourses?.length > 0) {
        student.totalEnrolled = student.enrolledCourses.length
        student.enrolledCourses = student.enrolledCourses.map((ec => ec = ec?.course)).filter((c => c !== null))
      }
      student.name = `${student.firstName} ${student.lastName}`;


      console.log('student ===>', student)
      return SuccessHandler(student, 200, res, 'Student with details retrieved successfully');

    } catch (error) {
      console.log('error', error);
      return ErrorHandler('Internal server error', 500, res);
    }
  },

  getEnrolledCourses: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('hi')
      // Simple validation - remove regex, only ObjectId check
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return ErrorHandler("Valid student ID required", 400, res);
      }
      const pipeline = [
        // Match by student ID
        { $match: { student: new mongoose.Types.ObjectId(id) } },

        // Student Info
        {
          $lookup: {
            from: "students",
            localField: "student",
            foreignField: "_id",
            as: "studentInfo",
            pipeline: [
              { $project: this.config.projection.student }
            ]
          }
        },
        { $unwind: "$studentInfo" },

        // Subscription Info
        {
          $lookup: {
            from: "subscriptions",
            localField: "studentInfo.subscriptionId",
            foreignField: "_id",
            as: "subscriptionInfo",
            pipeline: [
              { $project: this.config.projection.subscription }
            ]
          }
        },
        { $unwind: { path: "$subscriptionInfo", preserveNullAndEmptyArrays: true } },

        // Course Info
        {
          $lookup: {
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "courseInfo",
            pipeline: [
              { $project: this.config.projection.course }
            ]
          }
        },

        // Group Data
        {
          $group: {
            _id: "$student",
            name: { $first: { $concat: ["$studentInfo.firstName", " ", "$studentInfo.lastName"] } },
            email: { $first: "$studentInfo.email" },
            phone: { $first: "$studentInfo.phone" },
            bio: { $first: "$studentInfo.bio" },
            profile: { $first: "$studentInfo.profile" },
            subscriptionPriceId: { $first: "$subscriptionInfo.priceId" },
            subscriptionStatus: { $first: "$subscriptionInfo.status" },
            enrolledCourses: {
              $push: {
                $cond: [
                  { $gt: [{ $size: "$courseInfo" }, 0] },
                  {
                    _id: { $arrayElemAt: ["$courseInfo._id", 0] },
                    name: { $arrayElemAt: ["$courseInfo.name", 0] },
                    enrolledAt: "$createdAt"
                  },
                  "$$REMOVE"
                ]
              }
            }
          }
        },

        // Compute Plan & Status
        {
          $addFields: {
            planActive: {
              $and: [
                { $ne: ["$subscriptionPriceId", null] },
                { $eq: ["$subscriptionStatus", "active"] }
              ]
            },
            plan: {
              $switch: {
                branches: Object.entries(this.config.priceIds).map(([key, value]) => ({
                  case: { $eq: ["$subscriptionPriceId", value] },
                  then: key.charAt(0).toUpperCase() + key.slice(1)
                })),
                default: null
              }
            }
          }
        }
      ];

      const student = await EnrolledCourses.aggregate(pipeline);
      console.log('student ===>', student)
      if (!student || student.length === 0) {
        return ErrorHandler("Student does not exist or has no enrolled courses", 404, res);
      }

      return SuccessHandler(student, 200, res, "Student with details retrieved successfully");
    } catch (error) {
      return ErrorHandler("Failed to retrieve student details", 500, res, error);
    }
  }

};

export default studentController;