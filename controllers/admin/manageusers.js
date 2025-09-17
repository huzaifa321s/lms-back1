import Student from "../../models/student.js";
import Teacher from "../../models/teacher.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";

const manageUsersController = {
    getUsers: async (req, res) => {
        const { userType, page } = req.query;
        const excluded = "-password -otp -wallet -otpGenerateAt -otpVerified -verifiedUser -twoFactorAuthentication -notifications";

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 2; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let Model = null;
            if (userType.toLowerCase() === 'student') Model = Student;
            if (userType.toLowerCase() === 'teacher') Model = Teacher;

            const totalUsers = await Model.countDocuments();
            const totalPages = Math.ceil(totalUsers / itemsPerPage);

            const users = await Model.find().select(excluded).skip(skip).limit(itemsPerPage);

            return SuccessHandler({ users, totalPages }, 200, res, `All registered ${userType}s retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    search: async (req, res) => {
        const { searchInput, userType } = req.query;
        try {

            let Model = null;
            if (userType.toLowerCase() === 'student') Model = Student;
            if (userType.toLowerCase() === 'teacher') Model = Teacher;

            let query = {};
            let conditions = [];
            const searchTerms = searchInput.split(" ");
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

            const searchResult = await Model.find(query);
            
            return SuccessHandler({ searchResult }, 200, res, "Search performed!");
        } catch (error) {
            console.log(error);
            return ErrorHandler("Some internal error", 500, res);
        }
    }
};

export default manageUsersController;

