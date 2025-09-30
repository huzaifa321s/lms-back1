import mongoose from "mongoose";
// Models
import Course from "../../models/course.js";
// Utils
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import EnrolledCourses from "../../models/enrolledcourses.js";

const courseController = {
    
    get: async (req, res) => {
        const { page, q ,userID} = req.query;
console.log("req.query ===>",req.query)
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 10; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = {}
if (q) {
  const search = q.trim()
  query = { name: { $regex: new RegExp(search, "i") } }
}

            const totalCourses = await Course.countDocuments(query);
            console.log('totalCourses ===>',totalCourses)
            const totalPages = Math.ceil(totalCourses / itemsPerPage);
            // const course = await Course.find(query).skip(skip).limit(itemsPerPage).populate("category").exec();
            const courses = await Course.find(query).populate('instructor category').skip(skip).limit(itemsPerPage);
            console.log('courses ====>',courses.map((c => c._id.toString())))
            let enrolledCourses = [];
            for(let i = 0; i < courses.length ; i++){
               enrolledCourses.push(...await EnrolledCourses.find({student:userID}))
            }
            
            if(enrolledCourses?.length){
                enrolledCourses = [... new Set(enrolledCourses.map((ec) => ec.course.toString()))]
            }

            console.log('studentsCount ===>',enrolledCourses)
            return SuccessHandler({ courses, totalPages,enrolledCourses }, 200, res, `Courses retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
    getCourse:async(req,res) =>{
        const {courseID,userID} = req.query;
        
console.log('req.user',req.user)
        
        try{
            
          const course = await Course.findById(courseID).populate('instructor category');
          const studentEnrolled = await EnrolledCourses.findOne({course:courseID,student:userID});
          console.log('studentEnrolled',studentEnrolled)
          let allEnrolledStudents = await EnrolledCourses.find({course:courseID})
          if(allEnrolledStudents?.length > 0){
           allEnrolledStudents = Array.from(new Map(allEnrolledStudents.map((aec  => [aec.student.toString(),aec]) )).values())
          }

          return SuccessHandler({ course ,isEnrolled:studentEnrolled ? true : false,enrolledStudents:allEnrolledStudents?.length,isLoggedIn: Boolean(req?.user?.id)}, 200, res, `Course retrieved!`);
        }catch(error){
            console.log('error',error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },
      getLandingCourses: async (req, res) => {
    try {
      // Query params: limit aur sort
      const { limit, sort } = req.query;

      const selectedLimit = parseInt(limit) || 6;
      const sortOrder = sort === "asc" ? 1 : -1; 

      // Fetch courses with only required fields
      const courses = await Course.find({})
        .select("name description coverImage color instructor category createdAt")
        .populate("instructor category", "name") // sirf name field populate karte hain
        .sort({ createdAt: sortOrder })
        .limit(selectedLimit);

      return SuccessHandler(
        { courses },
        200,
        res,
        "Landing courses retrieved!"
      );
    } catch (error) {
      console.error("Landing Courses Error:", error);
      return ErrorHandler("Internal server error", 500, res);
    }
  },

};

export default courseController;
