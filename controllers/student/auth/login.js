import EnrolledCourses from "../../../models/enrolledcourses.js";
import Student from "../../../models/student.js";
import Subscription from "../../../models/subscription.js";
import Login from "../../../utils/auth/Login.js";
import { getStudentActivePlan } from "../../../utils/functions/HelperFunctions.js";

class StudentLogin extends Login {
    userType = "Student"

    constructor() {
        super(Student);
    }

    async getCredentials(user) {

        // Get enrolled courses ids if student have, so we may filter enrollment button on web
        const enrolledCourses = await EnrolledCourses.find({ student: user._id }).select('course').lean().exec();
            
        
        // Final credentials
        const credentials = {
            _id: user._id,
            profile: user.profile,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            email: user.email,
            dateOfBirth: user.dateOfBirth,
            phone: user.phone,
            remainingEnrollmentCount: user.remainingEnrollmentCount,
            status: user.status,
            notifications: user.notifications,
            subscription: await getStudentActivePlan(user.subscriptionId),
            enrolledCourses: enrolledCourses.map((c) => c.course),
            customerId: user.customerId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt

        }

        return credentials;
    }
}

export default StudentLogin