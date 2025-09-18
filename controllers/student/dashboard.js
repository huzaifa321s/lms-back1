import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import stripe from "stripe";
import EnrolledCourses from "../../models/enrolledcourses.js";
import Course from "../../models/course.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import { checkSubscription } from "../../middlewares/isSubscriber.js";

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

const dashboardController = {
  get: async (req, res) => {
    try {
      const isSubscriber = checkSubscription(req.user.subscriptionId);

      // Get enrolled courses
      const enrollments = await EnrolledCourses.find({ student: req.user._id }, 'course').lean();
      const courseIds = enrollments.map(e => e.course);

      const [coursesCount, courses] = await Promise.all([
        Course.countDocuments({ _id: { $in: courseIds } }),
        Course.find({ _id: { $in: courseIds } }, 'instructor').populate('instructor', '_id').lean()
      ]);

      // Get unique teachers
      const courseTeachers = [...new Set(
        courses.map(c => c?.instructor?._id?.toString()).filter(Boolean)
      )];

      // Non-subscriber response
      if (!isSubscriber) {
        return SuccessHandler({
          courses: coursesCount,
          courseTeachers,
          paymentMethods: 0,
          totalCharges: 0,
          spendingByYear: {},
        }, 200, res, "Dashboard data retrieved");
      }

      // Get Stripe data for subscribers
      const [invoices, paymentMethods] = await Promise.all([
        stripeInstance.invoices.list({ customer: req.user.customerId, status: "paid" }),
        stripeInstance.paymentMethods.list({ customer: req.user.customerId })
      ]);
      // Calculate spending by year
    const spendingByYear = {}; // <-- Initialize outside reduce

const totalCents = invoices.data.reduce((sum, inv) => {
  const cents = inv.amount_paid || 0;
  const date = new Date(inv.created * 1000);
  const year = String(date.getFullYear());
  const month = date.toLocaleString("default", { month: "short" });
  
  console.log('month ===>',month)
  // make sure year object exists
  if (!spendingByYear[year]) {
    spendingByYear[year] = {};
  }

  // make sure month is accumulated
  spendingByYear[year][month] = (spendingByYear[year][month] || 0) + cents / 100;

  return sum + cents;
}, 0);

console.log("spendingByYear ===>", spendingByYear);

      return SuccessHandler({
        courses: coursesCount,
        paymentMethods: paymentMethods.data,
        totalCharges: totalCents / 100,
        courseTeachers,
        spendingByYear,
      }, 200, res, "Dashboard data retrieved");

    } catch (error) {
      return ErrorHandler("Internal server error", 400, res);
    }
  },
};

export default dashboardController;