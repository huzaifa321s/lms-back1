import Course from "../../models/course.js";
import CourseCategory from "../../models/coursecategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import mongoose from "mongoose";



const courseCategoryController = {
add:  async (req, res) => {
    try {
      const { name, description } = req.body

      if (!name || !name.trim()) return ErrorHandler("Category name required", 400, res)

      if (await CourseCategory.exists({ name: name.trim() })) {
        return ErrorHandler("Category already exists", 400, res)
      }

      const newCategory = await CourseCategory.create({
        name: name.trim(),
        description: description?.trim() || "",
      })

      return SuccessHandler(newCategory, 201, res, "Course category created")
    } catch {
      return ErrorHandler("Failed to create category", 500, res)
    }
  },

    edit:  async (req, res) => {
    try {
      const { id } = req.params
      const { name, description } = req.body

      if (!id) return ErrorHandler("Category ID is required!", 400, res)

      const courseCategory = await CourseCategory.findById(id)
      if (!courseCategory) return ErrorHandler("Category not found!", 404, res)

      // Duplicate check only if name changed
      if (name && name.trim() !== courseCategory.name) {
        if (await CourseCategory.exists({ name: name.trim() })) {
          return ErrorHandler("Category with this name already exists!", 400, res)
        }
        courseCategory.name = name.trim()
      }

      // Optional description update
      if (description !== undefined) {
        courseCategory.description = description
      }

      await courseCategory.save()
      return SuccessHandler(courseCategory, 200, res, "Course category updated!")
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },

    get: async (req, res) => {
    try {
      const { page = 1, q } = req.query
      const pageNumber = Number.parseInt(page, 10) || 1
      const itemsPerPage = 8
      const skip = (pageNumber - 1) * itemsPerPage

      const matchStage = q ? { name: { $regex: q.trim(), $options: "i" } } : {}

      const [totalCategories, courseCategories] = await Promise.all([
        CourseCategory.countDocuments(matchStage),
        CourseCategory.aggregate([
          { $match: matchStage },
          {
            $lookup: {
              from: "courses",
              localField: "_id",
              foreignField: "category",
              as: "courses",
            },
          },
          {
            $addFields: {
              totalCourses: { $size: "$courses" },
              active: { $gt: [{ $size: "$courses" }, 0] },
            },
          },
          {
            $project: {
              name: 1,
              createdAt: 1,
              updatedAt: 1,
              totalCourses: 1,
              active: 1,
            },
          },
          { $skip: skip },
          { $limit: itemsPerPage },
        ]),
      ])

      const totalPages = Math.ceil(totalCategories / itemsPerPage)
      return SuccessHandler(
        { courseCategories, totalPages, currentPage: pageNumber },
        200,
        res,
        "Course categories retrieved!",
      )
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },

    getAll: async (_, res) => {
        try {

            const courses = await CourseCategory.find().lean();
            return SuccessHandler(courses, 200, res, `Course categories retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getCategory:async (req, res) => {
    try {
      const { id } = req.params
      if (!id) return ErrorHandler("ID is required", 400, res)

      const [category] = await CourseCategory.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "categoryId",
          as: "courses",
        },
      },
      {
        $addFields: {
          totalCourses: { $size: "$courses" },
          active: { $gt: [{ $size: "$courses" }, 0] },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          total: 1,
          active: 1,
        },
      },
    ]);
      console.log('category ==>',category)

      if (!category) return ErrorHandler("Category does not exist", 400, res)

      const formatted = {
        ...category,
        createdAt: category.createdAt?.toISOString(),
        updatedAt: category.updatedAt?.toISOString(),
        description: category.description || null,
      }

      return SuccessHandler(formatted, 200, res, "Course category fetched successfully!")
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },
    delete: async (req, res) => {
        const id = req.params.id; // This is presumably the category ID.
        const { deleteConfirmed } = req.body;

        try {
            if (!id) return ErrorHandler('Id is required', 400, res);

            const courseCategory = await CourseCategory.findById(id);
            if (!courseCategory) return ErrorHandler('Category does not exist', 400, res);
         
            // Check if there are any blogs in this category
            const coursesInCategory = await Course.find({ category: id });
            if (coursesInCategory.length > 0) {
                // if (deleteConfirmed === "Yes") {
                //     // If deletion is confirmed, delete all blogs in the category.
                //     for (const blog of blogsInCategory) {
                //         if (blog.image) {
                //             // Assuming deleteFile is a function that deletes the file and returns true/false.
                //             const deletedFile = deleteFile(blog.image, 'public/blog-images');
                //            if (!deletedFile) console.log(`Deletion Error: 'Blog #${blog._id}, image deletion failed!'`);
                //         }
                //         await Blog.findByIdAndDelete(blog._id);
                //     }
                //     // After deleting blogs, delete the category.
                //     await CourseCategory.findByIdAndDelete(id);
                //     return SuccessHandler(null, 200, res, `The category and All blogs with this category have been deleted.`);
                // } else {
                    
                //     // If deleteConfirmed is not true, send a warning message.
                //     return SuccessHandler(null, 200, res,'This category contains courses, so cannot be deleted!');
                // }
                    return ErrorHandler('This category contains courses, so cannot be deleted!', 200, res);
            } else {
                // If there are no blogs in the category, just delete the category.
                await CourseCategory.findByIdAndDelete(id);
                return SuccessHandler(null, 200, res, `Category deleted successfully.`);
            }
        } catch (error) {
            console.error("Error in deletion:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }


};

export default courseCategoryController;


