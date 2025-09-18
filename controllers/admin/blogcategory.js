import mongoose from "mongoose";
import Blog from "../../models/blog.js";
import BlogCategory from "../../models/blogcategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import { deleteFile } from "../../utils/functions/HelperFunctions.js";

const blogCategoryController = {

    add: async (req, res) => {
        const { name } = req.body;
        try {
            if (!name) return ErrorHandler('Category name is required', 400, res);

            const blogs = await BlogCategory.create({ name: name });
            return SuccessHandler(blogs, 200, res, `Blog category created!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    edit: async (req, res) => {
        const id = req.params.id;
        const { name } = req.body;
        console.log('id ===>',id)
        try {
            if (!id) return ErrorHandler('Id is required', 400, res);

            const blogCategory = await BlogCategory.findById(id);
            if (!blogCategory) return ErrorHandler('Category does not exist', 400, res);
            
            if(name) blogCategory.name = name;
            await blogCategory.save();

            return SuccessHandler(blogCategory, 200, res, `Blog category updated!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getAll: async (req, res) => {
        try {
console.log('getAll')
            const blogs = await BlogCategory.find({});
            return SuccessHandler(blogs, 200, res, `Blog categories retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },


    get: async (req, res) => {
        const {page, q} = req.query;
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 6;
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = {}
            if(q) {
                query = { name: { $regex: q, $options: "i" } }
            }
            console.log('query ===>',query)

            const totalBlogCategories = await BlogCategory.countDocuments(query);
            const totalPages = Math.ceil(totalBlogCategories / itemsPerPage);
console.log('totalPages ===>',totalPages)
            const blogCategories = await BlogCategory.aggregate([
         ...(q
        ? [{ $match: { name: { $regex: q.trim(), $options: "i" } } }]
        : []),
  {
    $lookup: {
      from: "blogs", // collection name of Blog model
      localField: "_id",
      foreignField: "category",
      as: "blogs",
    },
  },
  {
    $addFields: {
      active: { $gt: [{ $size: "$blogs" }, 0] }, // true if blogs exist
    },
  },
  {
    $project: {
      name: 1,
      createdAt: 1,
      updatedAt: 1,
      active: 1,
    },
  },
  { $skip: skip },
  { $limit: itemsPerPage },
]);


            return SuccessHandler({blogCategories, totalPages}, 200, res, `Blog categories retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getCategory:async (req,res) => {
        const id = req.params.id;
        console.log('id ===>',id)
        if(!id) return ErrorHandler('Id is required',400,res);
        const category = await BlogCategory.aggregate([
  // Match specific category
  { $match: { _id: new mongoose.Types.ObjectId(id) } },

  // Lookup blogs
  {
    $lookup: {
      from: "blogs",               // collection name of Blog model
      localField: "_id",
      foreignField: "category",    // reference field in Blog model
      as: "blogs",
    },
  },

  // Add total count + status
  {
    $addFields: {
      total: { $size: "$blogs" },
      active: { $gt: [{ $size: "$blogs" }, 0] }, // true if at least 1 blog
    },
  },

  // Cleanup
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
console.log('category ====>',category)

        if(!category.length) return ErrorHandler('Category does not exist',400,res);

        return SuccessHandler(category[0],200,res,`category with id:${id} ,retrieved`)
    },


    delete: async (req, res) => {
        const id = req.params.id; // This is presumably the category ID.
        const { deleteConfirmed } = req.body;
        console.log('deleteConfirmed ===>',deleteConfirmed)
        console.log('req.body ===>',req.body)
        
        try {
            if (!id) return ErrorHandler('Id is required', 400, res);
    
            const blogCategory = await BlogCategory.findById(id);
            if (!blogCategory) return ErrorHandler('Category does not exist', 400, res);
    
            // Check if there are any blogs in this category
            const blogsInCategory = await Blog.find({ category: id });
            if (blogsInCategory.length > 0) {
                if (deleteConfirmed === "Yes") {
                    // If deletion is confirmed, delete all blogs in the category.
                    for (const blog of blogsInCategory) {
                        if (blog.image) {
                            // Assuming deleteFile is a function that deletes the file and returns true/false.
                            const deletedFile = deleteFile(blog.image, 'public/blog-images');
                            if (!deletedFile) console.log(`Deletion Error: 'Blog #${blog._id}, image deletion failed!'`);

                        }
                        await Blog.findByIdAndDelete(blog._id);
                    }
                    // After deleting blogs, delete the category.
                    await BlogCategory.findByIdAndDelete(id);
                    return SuccessHandler(null, 200, res, `The category and All blogs with this category have been deleted.`);
                } else {
                    // If deleteConfirmed is not true, send a warning message.
                    return ErrorHandler('This category contains some blogs', 200, res);
                }
            } else {
                // If there are no blogs in the category, just delete the category.
                await BlogCategory.findByIdAndDelete(id);
                return SuccessHandler(null, 200, res, `Category deleted successfully.`);
            }
        } catch (error) {
            console.error("Error in deletion:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }
    

};

export default blogCategoryController;


