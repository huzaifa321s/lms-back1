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
create: async (req, res) => {
  try {
    const user = req.user;
    const { name, description, category, material_length } = req.body;

    if (!user) return ErrorHandler("Unauthorized - Please login first!", 401, res);
    if (!name || !description || !category || !material_length) {
      return ErrorHandler("All fields are required!", 400, res);
    }

    const teacher = await Teacher.findById(user._id);
    if (!teacher) return ErrorHandler("Instructor not found!", 404, res);

    // Generate random color for course
    const randomColor = () =>
      `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(
        Math.random() * 255
      )}, 1)`;

    let courseObj = {
      name,
      description,
      category,
      instructor: teacher._id,
      color: randomColor(),
    };

    // Handle cover image upload
    if (req.files?.coverImage) {
      const coverImageFile = req.files.coverImage;
      if (!allowedImageTypes.includes(coverImageFile.mimetype)) {
        return ErrorHandler("Invalid cover image type!", 400, res);
      }
      const uploadedImage = saveFile(coverImageFile, "public/courses/cover-images");
      if (!uploadedImage) return ErrorHandler("Cover image upload failed!", 400, res);

      courseObj.coverImage = uploadedImage;
    }

    // Handle course materials
    const material = [];
    const materialLength = parseInt(material_length, 10) || 0;

    for (let i = 0; i < materialLength; i++) {
      const title = req.body[`material[${i}][title]`];
      const desc = req.body[`material[${i}][description]`];
      const file = req.files?.[`material[${i}][media]`];

      if (!file) return ErrorHandler(`Media file missing for material ${i + 1}`, 400, res);

      const uploadedMedia = saveFile(file, "public/courses/material");
      if (!uploadedMedia) return ErrorHandler("Media file upload failed!", 400, res);

      material.push({
        title,
        description: desc,
        type: file.mimetype.split("/")[0],
        media: uploadedMedia,
      });
    }

    courseObj.material = material;

    // Save course & assign to teacher
    const course = await Course.create(courseObj);
    teacher.courses.push(course._id);
    await teacher.save();

    return SuccessHandler(null, 201, res, "Course created successfully!");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},

    edit: async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, material_length, removed_material_length } = req.body;
        const user = req.user;

        if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

        const teacher = await Teacher.findById(user._id);
        if (!teacher) return ErrorHandler('Instructor not found!', 404, res);

        const course = await Course.findById(id);
        if (!course) return ErrorHandler('Course not found!', 404, res);

        if (course.instructor.toString() !== user._id.toString()) {
            return ErrorHandler('Only course owner can edit the course!', 400, res);
        }

        // Update basic details
        Object.assign(course, { name, category, description });

        // Handle cover image update
        if (req.files?.coverImage) {
            const coverImageFile = req.files.coverImage;
            if (!allowedImageTypes.includes(coverImageFile.mimetype)) {
                return ErrorHandler('Invalid image type!', 400, res);
            }
            const uploadedImage = saveFile(coverImageFile, 'public/courses/cover-images');
            if (!uploadedImage) return ErrorHandler('Uploading cover image failed!', 400, res);

            if (course.coverImage) deleteFile(course.coverImage, 'public/courses/cover-images');
            course.coverImage = uploadedImage;
        }

        // Handle material update/new addition
        const newMaterials = [];
        for (let i = 0; i < Number(material_length); i++) {
            const matId = req.body[`material[${i}][_id]`];
            const title = req.body[`material[${i}][title]`];
            const desc = req.body[`material[${i}][description]`];
            const file = req.files?.[`material[${i}][media]`];

            if (matId) {
                const materialIndex = course.material.findIndex(m => m._id.toString() === matId);
                if (materialIndex === -1) return ErrorHandler('Material not found!', 400, res);

                Object.assign(course.material[materialIndex], { title, description: desc });

                if (file) {
                    const uploadMedia = saveFile(file, "public/courses/material");
                    if (!uploadMedia) return ErrorHandler('Media file uploading failed!', 400, res);

                    if (course.material[materialIndex].media) {
                        deleteFile(course.material[materialIndex].media, 'public/courses/material');
                    }

                    Object.assign(course.material[materialIndex], {
                        type: file.mimetype.split("/")[0],
                        media: uploadMedia
                    });
                }
            } else {
                if (!file) return ErrorHandler('Some media file is must!', 400, res);
                const uploadMedia = saveFile(file, "public/courses/material");
                if (!uploadMedia) return ErrorHandler('Media file uploading failed!', 400, res);

                newMaterials.push({
                    title,
                    description: desc,
                    type: file.mimetype.split("/")[0],
                    media: uploadMedia
                });
            }
        }
        course.material.push(...newMaterials);

        // Handle removed materials
        for (let i = 0; i < Number(removed_material_length); i++) {
            const id = req.body[`removed_material[${i}][_id]`];
            const media = req.body[`removed_material[${i}][media]`];

            deleteFile(media, 'public/courses/material');
            course.material = course.material.filter(m => m._id.toString() !== id);
        }

        await course.save();
        return SuccessHandler(null, 200, res, `Course updated!`);
    } catch (error) {
        console.error("Error updating course:", error);
        return ErrorHandler('Internal server error', 500, res);
    }
},

    delete: async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return ErrorHandler('Unauthorized - Login first!', 400, res);

    const course = await Course.findById(id);
    if (!course) return ErrorHandler('Course not found!', 404, res);

    if (course.instructor.toString() !== user._id.toString())
      return ErrorHandler('Only course owner can delete the course!', 400, res);

    if (!(await Teacher.findById(user._id)))
      return ErrorHandler('Instructor not found!', 404, res);

    if (course.coverImage)
      deleteFile(course.coverImage, 'public/courses/cover-images');

    course.material.forEach(m =>
      deleteFile(m.media, 'public/courses/material')
    );

    await Course.findByIdAndDelete(id);

    return SuccessHandler(null, 200, res, 'Course deleted!');
  } catch (err) {
    console.error('Error:', err);
    return ErrorHandler('Internal server error', 500, res);
  }
},


   get: async (req, res) => {
  try {
    if (!req.user) return ErrorHandler('Unauthorized - Login first!', 400, res);

    const { page = 1, q } = req.query;
    const itemsPerPage = 10;
    const skip = (page - 1) * itemsPerPage;

    // query banate waqt condition short kar di
    const query = q
      ? { name: { $regex: q, $options: 'i' } }
      : { instructor: req.user._id };

    const totalCourses = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / itemsPerPage);

    const courses = await Course.find(query)
      .skip(skip)
      .limit(itemsPerPage)
      .lean();

    // studentsEnrolled add karne ke liye map + Promise.all use
    const courseList = await Promise.all(
      courses.map(async c => ({
        ...c,
        studentsEnrolled: await EnrolledCourses.countDocuments({ course: c._id })
      }))
    );

    return SuccessHandler({ courses: courseList, totalPages }, 200, res, 'Courses retrieved!');
  } catch (err) {
    console.error('Error:', err);
    return ErrorHandler('Internal server error', 500, res);
  }
},


  getCourse:async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Inline input validation
    if (!user || !id) {
      return ErrorHandler("Unauthorized or missing course ID", 401, res);
    }

    // Fetch course and enrolled count concurrently
    const [course, studentsEnrolled] = await Promise.all([
      Course.findById(id).lean(),
      EnrolledCourses.countDocuments({ course: id }),
    ]);
    if (!course) return ErrorHandler("Course not found", 404, res);

    course.studentsEnrolled = studentsEnrolled;

    return SuccessHandler(course, 200, res, "Course retrieved successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},


  getCourseStudents:async (req, res) => {
  try {
    const { page = 1, courseId, q } = req.query;

    // Inline input validation
    if (!courseId) {
      return ErrorHandler("Missing course ID", 400, res);
    }

    const itemsPerPage = 8;
    const skip = (page - 1) * itemsPerPage;

    // Build search query
    const query = q
      ? {
          $and: q.split(' ').map(term => ({
            $or: [
              { 'student.firstName': { $regex: term, $options: 'i' } },
              { 'student.lastName': { $regex: term, $options: 'i' } },
            ],
          })),
        }
      : {};

    // Fetch total count and enrolled students concurrently
    const [totalEnrolledStudents, enrolledStudents] = await Promise.all([
      EnrolledCourses.countDocuments({ course: courseId }),
      EnrolledCourses.aggregate([
        { $match: { course: new mongoose.Types.ObjectId(courseId) } },
        {
          $lookup: {
            from: 'students',
            localField: 'student',
            foreignField: '_id',
            as: 'student',
          },
        },
        { $unwind: '$student' },
        {
          $addFields: {
            student: {
              firstName: '$student.firstName',
              lastName: '$student.lastName',
              email: '$student.email',
            },
          },
        },
        { $match: query },
        { $project: { 'student.firstName': 1, 'student.lastName': 1, 'student.email': 1 } },
        { $skip: skip },
        { $limit: itemsPerPage },
      ]),
    ]);

    const totalPages = Math.ceil(totalEnrolledStudents / itemsPerPage);

    return SuccessHandler({ enrolledStudents, totalPages }, 200, res, "Students retrieved successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
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


