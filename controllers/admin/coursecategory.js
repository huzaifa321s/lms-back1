import Course from "../../models/course.js";
import CourseCategory from "../../models/coursecategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import mongoose from "mongoose";



const courseCategoryController = {

    add: async (req, res) => {
        const { name } = req.body;
        try {
            if (!name) return ErrorHandler('Category name is required', 400, res);

            const courses = await CourseCategory.create({ name: name });
            return SuccessHandler(courses, 200, res, `Course category created!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    edit: async (req, res) => {
        const id = req.params.id;
        const { name } = req.body;
        try {
            if (!id) return ErrorHandler('Id is required', 400, res);

            const courseCategory = await CourseCategory.findById(id);
            if (!courseCategory) return ErrorHandler('Category does not exist', 400, res);

            if (name) courseCategory.name = name;
            await courseCategory.save();

            return SuccessHandler(courseCategory, 200, res, `Course category updated!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    get: async (req, res) => {
        const { page, q } = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 6; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = {}
            if (q) {
                query = { name: { $regex: q, $options: "i" } }
            }

            const totalCoursesCategories = await CourseCategory.countDocuments(query);
            const totalPages = Math.ceil(totalCoursesCategories / itemsPerPage);
const courseCategories = await CourseCategory.aggregate([
  // Search/filter
  ...(q ? [{ $match: { name: { $regex: q, $options: "i" } } }] : []),

  // Lookup courses for each category
  {
    $lookup: {
      from: "courses",
      localField: "_id",
      foreignField: "category", // NOT categoryId, should match your Course model
      as: "courses",
    },
  },
  // Lookup enrolled courses for each category's courses
  {
    $lookup: {
      from: "enrolledcourses",
      let: { courseIds: "$courses._id" },
      pipeline: [
        { $match: { $expr: { $in: ["$course", "$$courseIds"] } } },
      ],
      as: "enrolled",
    },
  },
  // Add counts and active flag
  {
    $addFields: {
      totalCourses: { $size: "$courses" },
      totalEnrolled: { $size: "$enrolled" },
      active: { $gt: [{ $size: "$enrolled" }, 0] }, // true if at least 1 enrolled
    },
  },
  // Projection for only required fields
  {
    $project: {
      name: 1,
      createdAt: 1,
      updatedAt: 1,
      totalCourses: 1,
      active: 1,
    },
  },
  // Pagination
  { $skip: skip },
  { $limit: itemsPerPage },
]);

console.log('courseCategories ===>',courseCategories)

            return SuccessHandler({ courseCategories, totalPages }, 200, res, `Course categories retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getAll: async (_, res) => {
        try {

            const courses = await CourseCategory.find();
            return SuccessHandler(courses, 200, res, `Course categories retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getCategory:async (req,res) =>{
        const id = req.params.id;
      try{
        if(!id) return ErrorHandler("ID is required",400,res);

    const [category] = await CourseCategory.aggregate([
  { $match: { _id: new mongoose.Types.ObjectId(id) } },
  {
    $lookup: {
      from: "courses",
      localField: "_id",
      foreignField: "category", // NOTE: yahan "category" hona chahiye
      as: "courses",
    },
  },
  {
    $lookup: {
      from: "enrolledcourses",
      let: { courseIds: "$courses._id" },
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$course", "$$courseIds"] }, // course field in enrolledcourses
          },
        },
      ],
      as: "enrolled",
    },
  },
  {
    $addFields: {
      total: { $size: "$courses" },
      totalEnrolled: { $size: "$enrolled" },
      active: { $gt: [{ $size: "$enrolled" }, 0] }, // true if any enrolled
    },
  },
  {
    $project: {
      name: 1,
      description: 1,
      createdAt: 1,
      updatedAt: 1,
      total: 1,
      totalEnrolled: 1,
      active: 1,
      enrolled: 1, // Debug ke liye
    },
  },
]);
console.log('category ==>',category)

        if(!category) return ErrorHandler('Category does not exists',400,res);
        return SuccessHandler(category,200,res,'Course category fetched successfully');
       
      }catch(error){
        console.log('error',error);
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


