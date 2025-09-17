import mongoose from "mongoose";
import Course from "../../models/course.js";
import EnrolledCourses from "../../models/enrolledcourses.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import { deleteFile, saveFile } from "../../utils/functions/HelperFunctions.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";

const courseController = {

    get: async (req, res) => {
    try {
      const { page = 1, q, teacherId } = req.query
      const itemsPerPage = 5,
        skip = (page - 1) * itemsPerPage
      const query = {
        ...(q && { name: { $regex: q, $options: "i" } }),
        ...(teacherId && { instructor: teacherId }),
      }

      const [totalCourses, courses] = await Promise.all([
        Course.countDocuments(query),
        Course.find(query)
          .skip(skip)
          .limit(itemsPerPage)
          .select("name description price createdAt updatedAt category instructor")
          .populate({ path: "category", select: "_id name" })
          .populate({ path: "instructor", select: "firstName lastName" })
          .lean(),
      ]);

      const coursesWithCount = await Promise.all(
        courses.map(async (course) => {
          const enrolledCount = await EnrolledCourses.countDocuments({ course: course._id })
          return {
            ...course,
            enrolledCount,
            instructorFirstName: course.instructor?.firstName || "",
            instructorLastName: course.instructor?.lastName || "",
            instructor: undefined,
          }
        }),
      )

      return SuccessHandler(
        { courses: coursesWithCount, totalPages: Math.ceil(totalCourses / itemsPerPage) },
        200,
        res,
        "Courses retrieved!",
      )
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },
getCourse: async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return ErrorHandler("Id is required!", 400, res)

    // Get course with required fields + material
    const course = await Course.findById(id)
      .select("name description price material createdAt updatedAt category instructor")
      .populate("category", "_id name description")
      .populate("instructor", "firstName lastName")
      .lean()

    if (!course) return ErrorHandler("Course not found!", 404, res)

    // Enrolled students count
    const enrolledCount = await EnrolledCourses.countDocuments({ course: id })

    // Add computed fields
    course.enrolledCount = enrolledCount
    course.status = enrolledCount > 0 ? "Active" : "Inactive"
    console.log('course ===>',course)

    return SuccessHandler(course, 200, res, `Course with id: ${id} retrieved!`)
  } catch (error) {
    console.error("[getCourse] Error:", error)
    return ErrorHandler("Internal server error", 500, res)
  }
},





  edit: async (req, res) => {
  const { id } = req.params;
  const { name, description, category, material_length, removed_material_length } = req.body;
  const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];

  try {
    // Find course
    const course = await Course.findById(id);
    if (!course) return ErrorHandler("Course not found!", 404, res);

    // Update base fields
    if (name) course.name = name;
    if (category) course.category = category;
    if (description) course.description = description;

    // Handle cover image
    if (req.files?.coverImage) {
      const coverImageFile = req.files.coverImage;

      if (!allowedImageTypes.includes(coverImageFile.mimetype)) {
        return ErrorHandler("Invalid image type!", 400, res);
      }

      const uploadedImage = saveFile(coverImageFile, "public/courses/cover-images");
      if (!uploadedImage) return ErrorHandler("Uploading cover image failed!", 400, res);

      // delete old image if exists
      if (course.coverImage) {
        deleteFile(course.coverImage, "public/courses/cover-images");
      }
      course.coverImage = uploadedImage;
    }

    // Materials update
    const newMaterials = [];
    const materialLength = Number(material_length) || 0;

    for (let i = 0; i < materialLength; i++) {
      const materialId = req.body[`material[${i}][_id]`];
      const title = req.body[`material[${i}][title]`];
      const desc = req.body[`material[${i}][description]`];
      const file = req.files?.[`material[${i}][media]`];

      if (materialId) {
        // update existing material
        const materialIndex = course.material.findIndex(m => m._id.toString() === materialId.toString());
        if (materialIndex === -1) return ErrorHandler("Material not found!", 400, res);

        course.material[materialIndex].title = title;
        course.material[materialIndex].description = desc;

        if (file) {
          const uploadMedia = saveFile(file, "public/courses/material");
          if (!uploadMedia) return ErrorHandler("Media file uploading failed!", 400, res);

          // delete old media
          if (course.material[materialIndex].media) {
            deleteFile(course.material[materialIndex].media, "public/courses/material");
          }

          course.material[materialIndex].type = file.mimetype.split("/")[0];
          course.material[materialIndex].media = uploadMedia;
        }
      } else {
        // create new material
        if (!file) return ErrorHandler("Some media file is required!", 400, res);

        const uploadMedia = saveFile(file, "public/courses/material");
        if (!uploadMedia) return ErrorHandler("Media file uploading failed!", 400, res);

        newMaterials.push({
          title,
          description: desc,
          type: file.mimetype.split("/")[0],
          media: uploadMedia,
        });
      }
    }

    // Add new materials
    if (newMaterials.length) {
      course.material.push(...newMaterials);
    }

    // Remove materials if requested
    const removedLength = Number(removed_material_length) || 0;
    if (removedLength > 0) {
      const removeIds = [];
      for (let i = 0; i < removedLength; i++) {
        const removeId = req.body[`removed_material[${i}][_id]`];
        const media = req.body[`removed_material[${i}][media]`];

        if (media) deleteFile(media, "public/courses/material");
        removeIds.push(removeId);
      }

      course.material = course.material.filter(m => !removeIds.includes(m._id.toString()));
    }

    await course.save();

    return SuccessHandler(null, 200, res, "Course updated!");
  } catch (error) {
    console.error("[edit] Error:", error);
    return ErrorHandler("Internal server error", 500, res);
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

