import Course from "../../models/course.js";
import Student from "../../models/student.js";
import EnrolledCourses from "../../models/enrolledcourses.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import TeacherWallet from "../../models/teacherwallet.js";
import Teachers from "../../models/teacher.js";
import { ObjectId } from "mongodb";
import Teacher from "../../models/teacher.js";

const courseController = {
    enrollCourse: async (req, res) => {
        try {
            console.log('req.user ===>', req.user)
            const course = await Course.findById(req.body.courseId);
            if (!course) return ErrorHandler('Course not found!', 404, res);

            const student = await Student.findById(req.user._id);
            if (student.remainingEnrollmentCount === 0) {
                return ErrorHandler('Enrollment limit exceeded!', 404, res);
            }

            await EnrolledCourses.create({
                course: req.body.courseId,
                student: req.user._id
            });

            // Update teacher wallet
            await TeacherWallet.findOneAndUpdate(
                { teacher: course.instructor },
                { $inc: { points: 10 } },
                { upsert: true },
            );
            await Teacher.findOneAndUpdate(
                { _id: course.instructor },
                { $addToSet: { students: { student: req.user._id?.toString() } } },
                { upsert: true, new: true }
            );

            student.remainingEnrollmentCount -= 1;
            await student.save();

            return SuccessHandler({ remainingEnrollmentCount: student.remainingEnrollmentCount }, 200, res, `Enrolled successfully!`);
        } catch (error) {
            console.log('error', error)
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getEnrolledCourses: async (req, res) => {
        const { page, q, countDocs } = req.query;
        const skip = (page - 1) * 10;

        try {
            if (!req.user) return ErrorHandler('Unauthorized', 400, res);
            console.log('q ===>', q)
            const enrolledCourses = await EnrolledCourses.find({ student: req.user._id })
                .skip(skip)
                .limit(10)
                .sort({ createdAt: -1 })
                .populate({
                    path: "course",
                    match: { name: { $regex: q, $options: "i" } },
                      populate: {
                    path: "instructor",
                    select: "firstName lastName"
                }
                })
                .select("course");

            let allEnrolledCourses = await EnrolledCourses.find({ student: req.user._id }).populate({
                path: "course",
                select: "name description",
                match: { name: { $regex: q, $options: "i" } },
             
            });


            allEnrolledCourses = allEnrolledCourses.filter((ec => ec.course !== null))
            console.log('allEnrolledCourses', allEnrolledCourses[0])
            let filteredEnrolledCourses = enrolledCourses.filter((ec => ec.course !== null))

            filteredEnrolledCourses = filteredEnrolledCourses.map((ec => ec = ec.course));
            console.log('filteredEnrolledCourses', filteredEnrolledCourses)


            if (countDocs) return SuccessHandler(allEnrolledCourses.length, 200, res, 'Count retrieved');

            const totalPages = Math.ceil(allEnrolledCourses.length / 10);
            console.log('totalPages ===>', totalPages)
            return SuccessHandler({ courses: filteredEnrolledCourses, totalPages }, 200, res, 'Courses retrieved');
        } catch (error) {
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getCourseTeachers: async (req, res) => {
        try {
            let { teacherIDs, page, q } = req.query;

            console.log('q ===>', q)

            const limit = 10;
            const skip = (page - 1) * limit;
            if (teacherIDs === 'undefined') return ErrorHandler('Teacher IDs required', 400, res);

            teacherIDs = JSON.parse(teacherIDs).map(id => new ObjectId(id));
            let query = { _id: { $in: teacherIDs } };
            console.log('q ===>', q.split(' ')[0])
            if (q) {
                query = {
                    ...query,
                    firstName: { $regex: q, $options: "i" },
                };
                if (q.includes(" ")) {
                    q = q.split(' ')
                    query = {
                        ...query,
                        firstName: { $regex: q[0], $options: "i" },
                        lastName: { $regex: q[1], $options: "i" }
                    }
                }

            }

            console.log('query ===>', query)
            const teachers = await Teachers.find(query).populate('courses').skip(skip).limit(limit);
            console.log('teachers ===>', teachers)

            const totalTeachers = await Teachers.countDocuments(query);
            const totalPages = Math.ceil(totalTeachers / limit);

            return SuccessHandler({ teachers, totalPages }, 200, res, 'Teachers fetched');
        } catch (error) {
            return ErrorHandler("Internal server error", 400, res);
        }
    },

    getTeacher: async (req, res) => {
        try {
            const teacher = await Teachers.findById(req.params.id).populate('courses');
            if (!teacher) return ErrorHandler('Teacher not found', 400, res);

            return SuccessHandler(teacher, 200, res, 'Teacher retrieved');
        } catch (error) {
            return ErrorHandler("Internal server error", 400, res);
        }
    },

    get: async (req, res) => {
        const { page, q, teacherId } = req.query;
        const skip = (page - 1) * 5;
        console.log('page ===>', page)
        try {
            let query = {};
            if (q) query.name = { $regex: q, $options: "i" };
            if (teacherId) query.instructor = teacherId;
            console.log('query', query)
            const [courses, total] = await Promise.all([
                Course.find(query)
                    .skip(skip)
                    .limit(5)
                    .populate("category", "name")
                    .populate("instructor", "firstName lastName"),
                Course.countDocuments(query)
            ]);

            return SuccessHandler({ courses, totalPages: Math.ceil(total / 5) }, 200, res, 'Courses retrieved');
        } catch (error) {
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getEnrolledCourseDetails: async (req, res) => {
        try {
            const course = await Course.findById(req.params.id)
                .populate("category", "name")
                .populate("instructor", "firstName lastName");

            if (!course) return ErrorHandler('Course not found', 404, res);
            return SuccessHandler(course, 200, res, 'Course retrieved');
        } catch (error) {
            return ErrorHandler('Internal server error', 500, res);
        }
    }
}

export default courseController;