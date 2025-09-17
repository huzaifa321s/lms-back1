import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import stripe from "stripe";
import EnrolledCourses from "../../models/enrolledcourses.js";
import Course from "../../models/course.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import { checkSubscription } from "../../middlewares/isSubscriber.js";
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
const dashboardController = {
    get: async (req, res) => {
        const isSubscriber = checkSubscription(req.user.subscriptionId);

        try {
  let enrolledCourseIds = await EnrolledCourses.find({
                student: req.user._id
            }).select('course')
            const courseIds = enrolledCourseIds.map(enrolled => enrolled.course);
            let query = { _id: { $in: courseIds } };
            const coursesCount = await Course.find(query).countDocuments()
            let courseTeachers = await Course.find({}).populate('instructor');
            courseTeachers = courseTeachers.map(ct => ct.instructor._id)
            courseTeachers = courseTeachers.filter(i => courseIds.map(c => i === c));
            courseTeachers = [...new Map(courseTeachers.map(id => [id.toString(), id])).values()]

           if(!isSubscriber){
            return {courses:coursesCount,courseTeachers,paymentMethods:0,totalCharges:0,spendingByYear:{}}
           }
            
            let totalCharges = [];
            const charges = await stripeInstance.invoices.list({
                customer: req.user.customerId,
                status: 'paid'
            });
            const spendingByYear = {};
            charges.data.forEach((invoice) => {
                const date = new Date(invoice.created * 1000);
                const year = date.getFullYear().toString();
                const month = date.toLocaleString('default', { month: 'short' });
                if (!spendingByYear[year]) {
                    spendingByYear[year] = {};
                }
                if (!spendingByYear[year][month]) {
                    spendingByYear[year][month] = 0;
                }
                spendingByYear[year][month] += invoice.amount_paid / 100;

            });
            charges.data.map(c => totalCharges.push(c.amount_paid));
            totalCharges = totalCharges.reduce((acc, curr) => acc + curr, 0);
            let paymentMethods = await stripeInstance.paymentMethods.list({ customer: req.user.customerId });
          

            console.log('spendingByYear ===>', spendingByYear)

            return SuccessHandler({
                courses: coursesCount,
                paymentMethods: paymentMethods.data,
                totalCharges: totalCharges / 100,
                courseTeachers,
                spendingByYear,
            }, 200, res, "Dashboard data retrieved successfully")

        } catch (error) {
            console.log('error', error);
            return ErrorHandler('Internal server error', 400, res)
        }
    }
}


export default dashboardController;