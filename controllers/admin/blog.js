import Blog from "../../models/blog.js";
import BlogCategory from "../../models/blogcategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import { deleteFile, saveFile } from "../../utils/functions/HelperFunctions.js";
import mongoose from "mongoose";

const blogController = {
    add: async (req, res) => {
        const { title, content, category } = req.body;
        try {

            // if (!title || !content || !category || !req.files) {                           // ------------> production enviroment
            //     return ErrorHandler('Please provide all required fields', 400, res);
            // }

            if(!title || !content || !category) {                                       // ------------------> testing enviroment
                return ErrorHandler('Please provide all required fields',400,res);         
            }
            // -----------------------------------------> production env

            // const categoryExists = await BlogCategory.findById(category);
            // if (!categoryExists) return ErrorHandler('Category does not exist', 400, res);

            // const { image } = req.files;
            // const uploadedBlogImage = saveFile(image, 'public/blog-images');
            // if (!uploadedBlogImage) return ErrorHandler('Blog image uploading failed', 400, res);

            // const blog = {
            //     title,
            //     content,
            //     category: new mongoose.Types.ObjectId(category),
            //     image: uploadedBlogImage
            // }
               

            // --------------------------------------> testing env
            const categoryExists = await BlogCategory.findById(category);
            if (!categoryExists) return ErrorHandler('Category does not exist', 400, res);

            
            

            const blog = {
                title,
                content,
                category: new mongoose.Types.ObjectId(category),
            }
            await Blog.create(blog);
            return SuccessHandler(null, 200, res, `Blog added!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    get: async (req, res) => {
        const {page, q} = req.query;
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 10; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = {}
            if(q) {
                query = { title: { $regex: q, $options: "i" } }
            }

            const totalBlogs = await Blog.countDocuments(query);
            const totalPages = Math.ceil(totalBlogs / itemsPerPage);

            const blogs = await Blog.find(query).skip(skip).limit(itemsPerPage).populate("category").exec(); // -------> product enviroment
            // const blogs = await Blog.find(query).populate('category').exec();  // ----> testing enviroment
            console.log('blogs ===>',blogs.length);
            return SuccessHandler({blogs, totalPages}, 200, res, `Blogs retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getBlog: async (req, res) => {
        const id = req.params.id;
        try {
            
            if (!id) return ErrorHandler('Id is required!', 400, res);

            const blog = await Blog.findById(id);
            if (!blog) return ErrorHandler('Blog does not exist', 400, res);


            return SuccessHandler(blog, 200, res, `Blog with id: ${id}, retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
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
        const id = req.params.id;
        const { title, content, category } = req.body;
        try {

            if (!id) return ErrorHandler('Id is required', 400, res);

            const blog = await Blog.findById(id);
            if (!blog) return ErrorHandler('Blog does not exist', 400, res);

            if(title) blog.title = title;
            if(content) blog.content = content;
            if(category) blog.category = new mongoose.Types.ObjectId(category);


            if (req.files && req.files.image) {
                if (blog.image) {
                    const deletedFile = deleteFile(blog.image, 'public/blog-images');
                    if (!deletedFile) console.log("Deletion Error: 'Some error occured while deleting previous blog image!'")
                }
                const uploadedBlogImage = saveFile(req.files.image, 'public/blog-images');
                if (!uploadedBlogImage) return ErrorHandler('Blog image uploading failed', 400, res);
                
                blog.image = uploadedBlogImage;
            }

            await blog.save();
            return SuccessHandler(blog, 200, res, `Blogs edited!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }
};

export default blogController;


