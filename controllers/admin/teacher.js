import Teacher from "../../models/teacher.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";

const teacherController = {
    get: async (req, res) => {
        const {page, q} = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 8; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = {}
            if(q) {
                let conditions = [];
                const searchTerms = q.split(" ");
                searchTerms.forEach(term => {
                    const condition = {
                        $or: [
                            { firstName: { $regex: term, $options: "i" } },
                            { lastName: { $regex: term, $options: "i" } }
                        ]
                    };
                    conditions.push(condition);
                });
    
                if (conditions.length !== 0) query = { $and: conditions };
            }

            const totalCourses = await Teacher.countDocuments(query);
            const totalPages = Math.ceil(totalCourses / itemsPerPage);

            const teachers = await Teacher.find(query).skip(skip).limit(itemsPerPage);
            return SuccessHandler({teachers, totalPages}, 200, res, `Blogs retrieved!`);
        } catch (error) {
            console.error("Error retrieving:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getTeacher: async (req, res) => {
        const id = req.params.id;
        try {
            if (!id) return ErrorHandler('Id is required!', 400, res);

            const teacher = await Teacher.findById(id).populate({
                path: 'courses',
                select: 'name description category createdAt'
            })
            if (!teacher) return ErrorHandler('Teacher does not exist', 400, res);
            
            return SuccessHandler(teacher, 200, res, `Teacher with id: ${id}, retrieved!`);
        } catch (error) {
            console.error("Error retrieving:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
};

export default teacherController;

