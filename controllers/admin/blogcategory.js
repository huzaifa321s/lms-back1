import mongoose from "mongoose";
import Blog from "../../models/blog.js";
import BlogCategory from "../../models/blogcategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import { deleteFile } from "../../utils/functions/HelperFunctions.js";

const blogCategoryController = {

  add: async ({ body: { name } }, res) => {
  try {
    if (!name) return ErrorHandler("Category name is required", 400, res);
    return SuccessHandler(await BlogCategory.create({ name }), 200, res, "Blog category created!");
  } catch {
    return ErrorHandler("Internal server error", 500, res);
  }
},


    edit: async (req, res) => {
    try {
      const { id } = req.params
      const { name } = req.body
      if (!id) return ErrorHandler("Id is required", 400, res)

      const category = await BlogCategory.findById(id)
      if (!category) return ErrorHandler("Category does not exist", 400, res)

      if (name) category.name = name
      await category.save()

      return SuccessHandler(category, 200, res, "Blog category updated!")
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },

 
  getAll: async (_, res) => {
    try {
      const categories = await BlogCategory.find().lean()
      return SuccessHandler(categories, 200, res, "Blog categories retrieved!")
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },


    get: async (req, res) => {
    const { page = "1", q } = req.query
    const pageNumber = Number.parseInt(page, 10)
    const itemsPerPage = Number.parseInt(process.env.PAGE_SIZE || "6", 10)

    // Input Validation
    if (isNaN(pageNumber) || pageNumber < 1) {
      return ErrorHandler("Invalid page number", 400, res)
    }

    try {
      // Sanitized search query
      const searchQuery = q?.trim()
        ? { name: { $regex: q.trim().replace(/[\\*+?^$().{}|[\]]/g, "\\$&"), $options: "i" } }
        : {}

      // Combined query using $facet for performance
      const pipeline = [
        { $match: searchQuery },
        {
          $lookup: {
            from: "blogs",
            localField: "_id",
            foreignField: "category",
            as: "blogs",
          },
        },
        { $addFields: { active: { $gt: [{ $size: "$blogs" }, 0] } } },
        { $project: { name: 1, createdAt: 1, updatedAt: 1, active: 1 } },
        {
          $facet: {
            data: [{ $skip: (pageNumber - 1) * itemsPerPage }, { $limit: itemsPerPage }],
            total: [{ $count: "count" }],
          },
        },
      ]

      const result = await BlogCategory.aggregate(pipeline)
      const data = result[0]?.data || []
      const total = result[0]?.total[0]?.count || 0
      const totalPages = Math.ceil(total / itemsPerPage)

      return SuccessHandler({ blogCategories: data, totalPages }, 200, res, "Blog categories retrieved!")
    } catch (error) {
      console.error("[BlogCategory GET] Error:", error)
      return ErrorHandler("Internal server error", 500, res)
    }
  },
   getCategory: async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return ErrorHandler("Id is required", 400, res)

    const [category] = await BlogCategory.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "blogs",
          localField: "_id",
          foreignField: "category",
          as: "blogs",
        },
      },
      {
        $addFields: {
          total: { $size: "$blogs" },
          active: { $gt: [{ $size: "$blogs" }, 0] },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          total: 1,
          active: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ])
    console.log('category ===>',category)

    if (!category) return ErrorHandler("Category does not exist", 400, res)

    return SuccessHandler(category, 200, res, `Category with id:${id} retrieved`)
  } catch (error) {
    console.error("[getCategory] Error:", error)
    return ErrorHandler("Internal server error", 500, res)
  }
},

    delete: async (req, res) => {
    try {
      const { id } = req.params
      const { deleteConfirmed } = req.body
      if (!id) return ErrorHandler("Id is required", 400, res)

      const [category, blogs] = await Promise.all([BlogCategory.findById(id), Blog.find({ category: id })])

      if (!category) return ErrorHandler("Category does not exist", 400, res)

      if (blogs.length > 0) {
        if (deleteConfirmed !== "Yes") {
          return ErrorHandler("This category contains some blogs", 200, res)
        }

        await Promise.all([
          ...blogs.map((blog) => {
            blog.image && deleteFile(blog.image, "public/blog-images")
            return Blog.findByIdAndDelete(blog._id)
          }),
          BlogCategory.findByIdAndDelete(id),
        ])

        return SuccessHandler(null, 200, res, "Category and its blogs deleted successfully.")
      }

      await BlogCategory.findByIdAndDelete(id)
      return SuccessHandler(null, 200, res, "Category deleted successfully.")
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  }
};

export default blogCategoryController;


