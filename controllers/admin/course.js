import Course from "../../models/course.js";
import EnrolledCourses from "../../models/enrolledcourses.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import { deleteFile, saveFile } from "../../utils/functions/HelperFunctions.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";

const courseController = {

    get: async (req, res) => {
        const { page, q, teacherId } = req.query;
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 5; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = {}

            if (q) {
                query = { name: { $regex: q, $options: "i" } }
            }

            if (teacherId) {
                query = { ...query, instructor: teacherId }
            }

            const totalBlogs = await Course.countDocuments(query);
            const totalPages = Math.ceil(totalBlogs / itemsPerPage);
            const courses = await Course.find(query)
                .skip(skip)
                .limit(itemsPerPage)
                .select("name description price createdAt updatedAt category instructor") // only needed fields
                .populate({
                    path: "category",
                    select: "_id name"
                })
                .populate({
                    path: "instructor",
                    select: "firstName lastName"
                })
                .lean(); // convert to plain JS objects

            // Add enrolled count
            for (let course of courses) {
                const count = await EnrolledCourses.countDocuments({ course: course._id });
                course.enrolledCount = count;

                // Add instructor fields safely
                course.instructorFirstName = course.instructor?.firstName || "";
                course.instructorLastName = course.instructor?.lastName || "";

                // Optionally remove instructor object if you want
                delete course.instructor;
            }
            return SuccessHandler({ courses, totalPages }, 200, res, `Courses retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getCourse: async (req, res) => {
        const id = req.params.id;
        try {
            const user = req.user;
            if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

            if (!id) return ErrorHandler('Id is required!', 400, res);

            let course = await Course.findById(id)
                .populate("category")
                .populate({
                    path: "instructor",
                    select: "firstName lastName"
                })
                .exec();
            const enrolledStudents = await EnrolledCourses.find({ course: id }).populate("student").select("student")
            console.log('enrolledStudents ==>', enrolledStudents)
            course = {
                ...course.toObject(),
                enrolledStudents
            }
            // Later we will add enrolled students.

            return SuccessHandler(course, 200, res, `Course with id: ${id}, retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getCoursesStatus: async (req, res) => {
        try {
 const courses = await Course.find({})
                .select("_id")      
                .lean();
let enrolledCourses = [];
            // Add enrolled count
            for (let course of courses) {
                const count = await EnrolledCourses.find({ course: course._id }).select('course');
                enrolledCourses.push(...count)
            }
if(enrolledCourses.length > 0) {
    enrolledCourses = enrolledCourses.map((ec) => ec.course.toString())
}
console.log('courses.length ====>',courses.length)
   return SuccessHandler({total:courses.length,inActive:courses?.length - enrolledCourses?.length ,active:enrolledCourses?.length || 0}, 200, res, `Course updated!`);
        } catch (error) {
            console.log('error', error);
               return ErrorHandler('Internal server error', 500, res);
        }
    },

    edit: async (req, res) => {
        const id = req.params.id;
        const { name, description, category, material_length, removed_material_length } = req.body;
        const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];



        try {

            // Find the course by ID
            const course = await Course.findById(id);
            if (!course) return ErrorHandler('Course not found!', 404, res);


            // Update course name, category or desc provided.
            course.name = name;
            course.category = category;
            course.description = description;

            // Update cover image (if provided)
            if (req.files && req.files.coverImage) {
                const coverImageFile = req.files.coverImage;
                if (!allowedImageTypes.includes(coverImageFile.mimetype)) {
                    return ErrorHandler('Invalid image type!', 400, res);
                }
                const uploadedImage = saveFile(coverImageFile, 'public/courses/cover-images');
                if (!uploadedImage) return ErrorHandler('Uploading cover image failed!', 400, res);
                // Delete previous cover image if exists
                if (course.coverImage) {
                    const deletedFile = deleteFile(course.coverImage, 'public/courses/cover-images');
                    if (!deletedFile) console.log("Deletion Error: 'Some error occured while deleting course cover image!'");
                }
                course.coverImage = uploadedImage;
            }


            const newMaterials = [];
            const materialLength = Number(material_length);
            for (var i = 0; i < materialLength; i++) {
                const id = req.body[`material[${i}][_id]`];
                if (id) {
                    const title = req.body[`material[${i}][title]`];
                    const description = req.body[`material[${i}][description]`];

                    let file = null;
                    if (req.files && req.files[`material[${i}][media]`]) {
                        file = req.files[`material[${i}][media]`];
                    }

                    const materialIndex = course.material.findIndex(m => m._id.toString() === id.toString());
                    if (materialIndex === -1) return ErrorHandler('Material not found!', 400, res);

                    course.material[materialIndex].title = title;
                    course.material[materialIndex].description = description;

                    if (file) {
                        const uploadMedia = saveFile(file, "public/courses/material");
                        if (!uploadMedia) return ErrorHandler('Media file uploading failed!', 400, res);

                        if (course.material[materialIndex].media) {
                            const deletedFile = deleteFile(course.material[materialIndex].media, 'public/courses/material');
                            if (!deletedFile) console.log("Deletion Error: 'Some error occured while deleting course material image!'");
                        }

                        course.material[materialIndex].type = file.mimetype.split("/")[0];
                        course.material[materialIndex].media = uploadMedia;
                    }
                } else {
                    const title = req.body[`material[${i}][title]`];
                    const description = req.body[`material[${i}][description]`];

                    let file = req.files[`material[${i}][media]`];
                    if (!file) return ErrorHandler('Some media file is must!', 400, res);

                    const uploadMedia = saveFile(file, "public/courses/material");
                    if (!uploadMedia) return ErrorHandler('Media file uploading failed!', 400, res);

                    const materialObj = {
                        title,
                        description,
                        type: file.mimetype.split("/")[0],
                        media: uploadMedia
                    };
                    newMaterials.push(materialObj);
                }

            }

            // Concat the new added material in previous
            course.material = course.material.concat(newMaterials);

            // Remove the material (if ask for)
            const removedMaterialLength = Number(removed_material_length);
            if (removedMaterialLength > 0) {
                const removeMaterialIds = [];
                for (var i = 0; i < removedMaterialLength; i++) {
                    const id = req.body[`removed_material[${i}][_id]`];
                    const media = req.body[`removed_material[${i}][media]`];

                    const deletedFile = deleteFile(media, 'public/courses/material');
                    if (!deletedFile) console.log("Deletion Error: 'Some error occured while deleting course material image!");
                    removeMaterialIds.push(id);
                }
                course.material = course.material.filter((m) => !removeMaterialIds.includes(m._id.toString()));
            }


            await course.save();

            return SuccessHandler(null, 200, res, `Course updated!`);
        } catch (error) {
            console.error("Error updating course:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    delete: async (req, res) => {
        const id = req.params.id;
        try {

            const course = await Course.findById(id);
            if (!course) return ErrorHandler('Course not found!', 404, res);

            if (course.coverImage) {
                const deletedFile = deleteFile(course.coverImage, 'public/courses/cover-images');
                if (!deletedFile) console.log("Deletion Error: 'Some error occured while deleting course cover image!'");

            }

            course.material.forEach((m) => {
                const deletedFile = deleteFile(m.media, 'public/courses/material');
                if (!deletedFile) console.log("Deletion Error: 'Some error occured while deleting media file!'");
            });

            await Course.findByIdAndDelete(id);

            return SuccessHandler(null, 200, res, `Course deleted!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
};

export default courseController;

