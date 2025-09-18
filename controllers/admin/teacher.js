import Course from "../../models/course.js";
import EnrolledCourses from "../../models/enrolledcourses.js";
import Teacher from "../../models/teacher.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";

const teacherController = {
  get: async (req, res) => {
    const { page, q } = req.query;

    const pageNumber = parseInt(page) || 1;
    const itemsPerPage = 8;
    const skip = (pageNumber - 1) * itemsPerPage;

    try {
      // Build Query
      let query = {};
      if (q) {
        const searchTerms = q.split(" ");
        const conditions = searchTerms.map(term => ({
          $or: [
            { firstName: { $regex: term, $options: "i" } },
            { lastName: { $regex: term, $options: "i" } }
          ]
        }));

        if (conditions.length > 0) {
          query = { $and: conditions };
        }
      }

      // Fetch Data
      const totalTeachers = await Teacher.countDocuments(query);
      const totalPages = Math.ceil(totalTeachers / itemsPerPage);

      const teachers = await Teacher.find(query)
        .skip(skip)
        .limit(itemsPerPage)
        .lean(); // lean for faster queries

      // Response
      return SuccessHandler(
        { teachers, totalPages },
        200,
        res,
        `Teachers retrieved successfully!`
      );
    } catch (error) {
      console.error("Error retrieving teachers:", error);
      return ErrorHandler("Internal server error", 500, res);
    }
  },


  getTeacher: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return ErrorHandler("ID is required!", 400, res);
      }

      const teacher = await Teacher.findById(id)
        .populate({
          path: "courses",
          select: "name description category createdAt",
        })
        .lean();

      if (!teacher) {
        return ErrorHandler("Teacher not found!", 404, res);
      }

      return SuccessHandler(
        teacher,
        200,
        res,
        `Teacher retrieved successfully.`
      );
    } catch (error) {
      console.error("Error fetching teacher:", error);
      return ErrorHandler("Internal server error", 500, res);
    }
  },

  getTeachersStatus: async (req, res) => {
    try {
      let totalTeachers = await Teacher.find({}).select('_id');
      if (totalTeachers?.length > 0) {
        totalTeachers = totalTeachers.map((tc => tc._id.toString()))
      }
      console.log('totalTeachers ===>', totalTeachers.length)
      let activeTeachers = await Course.find({ instructor: { $in: totalTeachers } })
        .select("instructor")
        .lean();
      activeTeachers = [...new Map(activeTeachers.map(item => [item.instructor.toString()]).values())]

      return SuccessHandler({ total: totalTeachers.length || 0, active: activeTeachers?.length || 0, inActive: totalTeachers.length - activeTeachers?.length }, 200, res, `Course updated!`);
    } catch (error) {
      console.log('error', error);
      return ErrorHandler('Internal server error', 500, res);
    }
  },
};

export default teacherController;

