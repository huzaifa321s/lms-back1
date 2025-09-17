import Blog from "../../models/blog.js";
import BlogCategory from "../../models/blogcategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import { deleteFile, saveFile } from "../../utils/functions/HelperFunctions.js";
import mongoose from "mongoose";

const blogController = {
    add: async (req, res) => {
        try {
            const { user, body: { title, content, category } } = req;

            // Inline input validation
            if (!user || !title || !content || !category) {
                return ErrorHandler("Unauthorized or missing required fields", 401, res);
            }

            // Check if category exists
            if (!(await BlogCategory.exists({ _id: category }))) {
                return ErrorHandler("Category not found", 404, res);
            }

            const blog = await Blog.create({ title, content, category, author: user._id });
            return SuccessHandler(blog, 200, res, "Blog created successfully");
        } catch (error) {
            return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
        }
    },
  get: async (req, res) => {
    try {
      const { page = 1, q } = req.query
      const limit = 20,
        skip = (page - 1) * limit
      const query = q ? { title: { $regex: q, $options: "i" } } : {}

      const [count, blogs] = await Promise.all([
        Blog.countDocuments(query),
        Blog.find(query).skip(skip).limit(limit).populate("category"),
      ])

      return SuccessHandler({ blogs, totalPages: Math.ceil(count / limit) }, 200, res, "Blogs retrieved!")
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },

    getBlog: async (req, res) => {
    try {
      const { id } = req.params
      if (!id) return ErrorHandler("Id is required!", 400, res)

      const blog = await Blog.findById(id)
      return blog
        ? SuccessHandler(blog, 200, res, `Blog with id: ${id}, retrieved!`)
        : ErrorHandler("Blog does not exist", 400, res)
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },
    delete: async (req, res) => {
        const id = req.params.id;
        try {
            const blog = await Blog.findById(id);
            if (!blog) return ErrorHandler('Blog does not exist', 400, res);

            if (blog.image) {
                const deletedFile = deleteFile(blog.image, 'public/blog-images');
                if (!deletedFile) console.log("Deletion Error: 'Some error occured while deleting blog image!'");
            }

            await Blog.findByIdAndDelete(id);
            return SuccessHandler(null, 200, res, `Blogs deleted!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    edit: async (req, res) => {
    try {
      const { id } = req.params
      const { body, files } = req
      if (!id) return ErrorHandler("Id is required", 400, res)

      const blog = await Blog.findById(id)
      if (!blog) return ErrorHandler("Blog does not exist", 400, res)

      // Update blog fields conditionally
      body.title && (blog.title = body.title)
      body.content && (blog.content = body.content)
      body.category && (blog.category = new mongoose.Types.ObjectId(body.category))

      // Handle image upload
      if (files?.image) {
        blog.image && deleteFile(blog.image, "public/blog-images")
        const newImage = saveFile(files.image, "public/blog-images")
        if (!newImage) return ErrorHandler("Blog image uploading failed", 400, res)
        blog.image = newImage
      }

      await blog.save()
      return SuccessHandler(blog, 200, res, "Blog edited!")
    } catch {
      return ErrorHandler("Internal server error", 500, res)
    }
  },
};

export default blogController;


