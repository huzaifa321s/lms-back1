import mongoose from "mongoose";
import Course from "../../models/course.js";
import EnrolledCourses from "../../models/enrolledcourses.js";
import Teacher from "../../models/teacher.js";
// Utils
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import { deleteFile, saveFile } from "../../utils/functions/HelperFunctions.js";


const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];

const courseController = {
    create: async (req, res) => { // ADD CATEGORY IN FRONT END
        const user = req.user;
        const { name, description, category, material_length } = req.body;
        try {

            if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

            if (!name || !description || !category || !material_length) {
                return ErrorHandler('Provide all fields are required!', 400, res);
            }

            const teacher = await Teacher.findById(user._id);
            if (!teacher) return ErrorHandler('Instructor not found!', 404, res);

            // Generating color to specifiy the course (dounut chart)
            const r = Math.floor(Math.random() * 255);
            const g = Math.floor(Math.random() * 255);
            const b = Math.floor(Math.random() * 255);

            let courseObj = {
                name,
                description,
                category,
                instructor: teacher._id,
                color: `rgba(${r}, ${g}, ${b}, 1)`
            }

            if (req.files && req.files.coverImage) {
                const coverImageFile = req.files.coverImage;
                if (!allowedImageTypes.includes(coverImageFile.mimetype)) {
                    return ErrorHandler('Invalid image type!', 400, res);
                }
                const uploadedImage = saveFile(coverImageFile, 'public/courses/cover-images');
                if (!uploadedImage) return ErrorHandler('Uploading cover image failed!', 400, res);
                courseObj = { ...courseObj, coverImage: uploadedImage };
            }

            // Handling Course Material
            let material = [];
            const materialLength = Number(material_length);
            for (var i = 0; i < materialLength; i++) {
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

                material.push(materialObj);
            }

            courseObj = { ...courseObj, material };
            const course = await Course.create(courseObj)

            teacher.courses.push(course._id);
          

            return SuccessHandler(null, 200, res, `Course created!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }

    },

    edit: async (req, res) => {
        const id = req.params.id;
        const user = req.user;
        const { name, description, category, material_length, removed_material_length ,material} = req.body;
        try {
            if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

            // Check if the user is an instructor
            const teacher = await Teacher.findById(user._id);
            if (!teacher) return ErrorHandler('Instructor not found!', 404, res);

            // Find the course by ID
            const course = await Course.findById(id);
            if (!course) return ErrorHandler('Course not found!', 404, res);

            // Check if the user is the instructor of the course
            if (course.instructor.toString() !== user._id.toString()) {
                return ErrorHandler('Only course owner can edit the course!', 400, res);
            }

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
            const user = req.user;
            if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

            const course = await Course.findById(id);
            if (!course) return ErrorHandler('Course not found!', 404, res);

            if (course.instructor.toString() !== user._id.toString()) {
                return ErrorHandler('Only course owner can delete the course!', 400, res);
            }

            const teacher = await Teacher.findById(user._id);
            if (!teacher) return ErrorHandler('Instructor not found!', 404, res);

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

    get: async (req, res) => {
        const { page, q } = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 10; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {
            if (!req.user) return ErrorHandler('Unauthorized - Login first!', 400, res);
            const teacherId = req.user._id;

            let query = { instructor: teacherId }

            if (q) {
                query = { name: { $regex: q, $options: "i" } }
            }

            const totalBlogs = await Course.countDocuments(query);
            const totalPages = Math.ceil(totalBlogs / itemsPerPage);

            // const course = await Course.find(query).skip(skip).limit(itemsPerPage).populate("category").exec();
            const courses = await Course.find(query).skip(skip).limit(itemsPerPage).lean();

            const courseList = [];
            for (const c of courses) {
                const courseAlongStdCount = {
                    ...c,
                    studentsEnrolled: await EnrolledCourses.countDocuments({ course: c._id })
                }
                courseList.push(courseAlongStdCount);
            }

            return SuccessHandler({ courses: courseList, totalPages }, 200, res, `Courses retrieved!`);
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

            let course = await Course.findById(id).lean();

            course = {
                ...course,
                studentsEnrolled: await EnrolledCourses.find({ course: id }).populate('student')
            }
console.log('course ====>',course)
            return SuccessHandler(course, 200, res, `Course with id: ${id}, retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getCourseStudents: async (req, res) => {
        const { page, courseId, q } = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 6; // Set a default page size of 8
        const skip = (pageNumber - 1) * itemsPerPage;
        console.log('page ===>',page)

        try {

            let query = {}
            if (q) {
                let conditions = [];
                const searchTerms = q.split(" ");
                searchTerms.forEach(term => {
                    const condition = {
                        $or: [
                            { "student.firstName": { $regex: term, $options: "i" } },
                            { "student.lastName": { $regex: term, $options: "i" } }
                        ]
                    };
                    conditions.push(condition);
                });

                if (conditions.length !== 0) {
                    query = { $and: conditions };
                }
            }

            const totalEnrolledStudents = await EnrolledCourses.countDocuments({
                course: courseId
            });
console.log('totalEnrolledStudents ===>',totalEnrolledStudents)
            const totalPages = Math.ceil(totalEnrolledStudents / itemsPerPage);

            const enrolledStudents = await EnrolledCourses.aggregate([
                // Extract only courses with the given id
                { $match: { course: new mongoose.Types.ObjectId(courseId) } },
                // Perform a left outer join with the 'students' collection
                {
                    $lookup: {
                        from: 'students',
                        localField: 'student',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                // Deconstruct the array field 'student' to output a document for each element
                { $unwind: "$student" },
                // Add specific fields to the student document
                {
                    $addFields: {
                        "student.firstName": "$student.firstName",
                        "student.lastName": "$student.lastName",
                        "student.email": "$student.email"
                    }
                },
                // Filter documents based on the search query
                { $match: query },
                // Project only the necessary fields
                {
                    $project: {
                        "student.firstName": 1,
                        "student.lastName": 1,
                        "student.email": 1
                    }
                },
                // Skip the specified number of documents
                { $skip: skip },
                // Limit the number of documents returned
                { $limit: itemsPerPage },
            ]);
            
            return SuccessHandler({ enrolledStudents, totalPages }, 200, res, `Students retrieved!`);
        } catch (error) {
            console.error("Error retrieving:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }




    // -------------------- DISCARDED | NOT USED --------------------

    // search: async (req, res) => {
    //     const user = req.user;
    //     const { name, currentPage } = req.query;
    //     try {

    //         if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

    //         let query = { instructor: user._id };
    //         const searchBoxQuery = { name: { $regex: name, $options: "i" } };

    //         const pageNumber = parseInt(currentPage) || 1;
    //         const itemsPerPage = 10; // Set a default page size of 10
    //         const skip = (pageNumber - 1) * itemsPerPage;

    //         query = { $and: [query, searchBoxQuery] }


    //         const totalCourses = await Course.countDocuments(query);
    //         const totalPages = Math.ceil(totalCourses / itemsPerPage);

    //         const searchResult = await Course.find(query).skip(skip).limit(itemsPerPage);
    //         return SuccessHandler({ searchResult, totalPages }, 200, res, "Search performed!");
    //     } catch (error) {
    //         console.log(error);
    //         return ErrorHandler("Some internal error", 500, res);
    //     }
    // }


    // getMyCourses: async (req, res) => {
    //     const page = req.params.page;
    //     try {
    //         const user = req.user;
    //         if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

    //         const pageNumber = parseInt(page) || 1;
    //         const itemsPerPage = 10; // Set a default page size of 10
    //         const skip = (pageNumber - 1) * itemsPerPage;

    //         const totalCourses = await Course.countDocuments({ instructor: user._id });
    //         const totalPages = Math.ceil(totalCourses / itemsPerPage);

    //         const courses = await Course.find({ instructor: user._id }).skip(skip).limit(itemsPerPage);
    //         return SuccessHandler({ courses, totalPages }, 200, res, `Course created!`);
    //     } catch (error) {
    //         console.error("Error:", error);
    //         return ErrorHandler('Internal server error', 500, res);
    //     }
    // },


};

export default courseController;








// -------------------- DISCARDED | NOT USED --------------------

// const body = JSON.parse(req.body);
// console.log("parsed body --> ", body)
// console.log("Req body --> ", req.files['material[1][media]']);
// console.log("Req files --> ", req.files);

// const user = req.user;
// if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

// const teacher = await Teacher.findById(user._id);
// if (!teacher) return ErrorHandler('Instructor not found!', 404, res);

// // const courseCategory = await CourseCategory.findById(category);
// // if (!courseCategory) return ErrorHandler('Course category not found!', 404, res);

// let courseObj = {
//     name,
//     description,
//     instructor: teacher._id,
//     // category: courseCategory._id
// }

// if (req.files && req.files.coverImage) {
//     const coverImageFile = req.files.coverImage;

//     if (!allowedImageTypes.includes(coverImageFile.mimetype)) {
//         return ErrorHandler('Invalid image type!', 400, res);
//     }

//     const uploadedImage = saveFile(coverImageFile, 'public/courses/cover-images');
//     if (!uploadedImage) return ErrorHandler('Uploading cover image failed!', 400, res);

//     courseObj = { ...courseObj, coverImage: uploadedImage };
// }

// const course = await Course.create(courseObj)

// teacher.courses.push(course._id);
// await teacher.save();

// // courseCategory.courses.push(course._id);
// // await courseCategory.save();


