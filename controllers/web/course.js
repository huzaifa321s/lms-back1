import mongoose from "mongoose";
// Models
import Course from "../../models/course.js";
// Utils
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";

const courseController = {
    
    get: async (req, res) => {
        const { page, q } = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 10; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = { }
            if (q) query = { name: { $regex: q, $options: "i" } }

            const totalBlogs = await Course.countDocuments(query);
            const totalPages = Math.ceil(totalBlogs / itemsPerPage);

            // const course = await Course.find(query).skip(skip).limit(itemsPerPage).populate("category").exec();
            const courses = await Course.find(query).skip(skip).limit(itemsPerPage);
            return SuccessHandler({ courses, totalPages }, 200, res, `Courses retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

};

export default courseController;