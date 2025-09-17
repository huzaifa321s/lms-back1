import mongoose from 'mongoose';

const enrolledCoursesSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
    }

}, { timestamps: true });


const EnrolledCourses = mongoose.model('EnrolledCourses', enrolledCoursesSchema);
export default EnrolledCourses;