import stripe from "stripe";
import Student from "../../models/student.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import Subscription from "../../models/subscription.js";
import { attachPaymentMethod, getStudentActivePlan, planDetails, toTitleCase, updateCustomer, updatePaymentMethod, validateObjectId } from "../../utils/functions/HelperFunctions.js";
import mongoose from "mongoose";

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// Helper Functions 
const onUpdatedSubscription = async (subscription) => {
    const { user, dbReceipt } = subscription.metadata;
    const subscriptionObj = await Subscription.findById(dbReceipt);
    subscriptionObj.status = subscription.status;
    subscriptionObj.trailsEndAt = subscription.trial_end;
    subscriptionObj.endsAt = subscription.ended_at;
    subscriptionObj.billingCycleAnchor = subscription.billing_cycle_anchor; // New added (7/8/24)
    subscriptionObj.currentPeriodStart = subscription.current_period_start; // New added (7/8/24)
    subscriptionObj.currentPeriodEnd = subscription.current_period_end; // New added (7/8/24)
    await subscriptionObj.save();
    const studentObj = await Student.findById(user);
    studentObj.subscriptionId = subscriptionObj._id; // db receipt id.
    await studentObj.save();
}

const convertTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toISOString().split('T')[0];
};

// Input validation
const validateInput = ({ plan, paymentMethodId, user }) => {
    const validPlans = ["Bronze", "Silver", "Gold", "Daily"];
    if (!validPlans.includes(plan)) throw new Error("Invalid plan");
    if (!paymentMethodId?.startsWith("pm_")) throw new Error("Invalid payment method ID");
    if (!user?._id || !user?.email || !user?.firstName || !user?.lastName) throw new Error("Invalid user data");
};



// Input validation
const validateInputResubscription = ({ plan, user }) => {
    const validPlans = ["Bronze", "Silver", "Gold", "Daily"];
    if (!validPlans.includes(plan)) throw new Error("Invalid plan");
    if (!user?._id || !user?.customerId || !user?.firstName || !user?.lastName) throw new Error("Invalid user data");
};


// Input validation
const validateInputForPlanUpgration = ({ newPlan, user }) => {
    const validPlans = ["Bronze", "Silver", "Gold", "Daily"];
    if (!validPlans.includes(newPlan)) throw new Error("Invalid or missing plan");
    if (!user?.subscriptionId || !user?._id || !user?.customerId || !user?.firstName || !user?.lastName) {
        throw new Error("Invalid user data");
    }
};


// Plan configuration
const planConfig = {
    Bronze: { priceId: process.env.BRONZE_PRICE_ID, enrollmentCount: 4 },
    Silver: { priceId: process.env.SILVER_PRICE_ID, enrollmentCount: 8 },
    Gold: { priceId: process.env.GOLD_PRICE_ID, enrollmentCount: 12 },
    Daily: { priceId: process.env.DAILY_PRICE_ID, enrollmentCount: 2 },
};


const totalInvoices = 0;
const totalSpendings = 0;
const paymentController = {


    subscribe: async (req, res) => {
        const { plan, paymentMethodId } = req.body;
        const { _id, email, firstName, lastName } = req.user || {};

        try {
            // Validate inputs
            validateInput({ plan, paymentMethodId, user: req.user });

            // Start MongoDB transaction
            const session = await mongoose.startSession();
            await session.withTransaction(async () => {
                // Create Stripe customer
                const customer = await stripeInstance.customers.create({
                    email,
                    name: `${firstName} ${lastName}`,
                    payment_method: paymentMethodId,
                    invoice_settings: { default_payment_method: paymentMethodId },
                    metadata: { userId: _id.toString() },
                });

                // Create receipt in DB
                const dbReceipt = await Subscription.create(
                    [
                        {
                            user: _id,
                            customerId: customer.id,
                            priceId: planConfig[plan].priceId,
                        },
                    ],
                    { session }
                );

                // Create Stripe subscription
                const subscription = await stripeInstance.subscriptions.create({
                    customer: customer.id,
                    items: [{ price: planConfig[plan].priceId }],
                    metadata: {
                        user: _id.toString(),
                        name: `${firstName} ${lastName}`,
                        dbReceipt: dbReceipt[0]._id.toString(),
                    },
                    expand: ["latest_invoice.payment_intent"],
                });

                // Update receipt
                Object.assign(dbReceipt[0], {
                    status: subscription.status,
                    subscriptionId: subscription.id,
                    trailsEndAt: subscription.trial_end,
                    endsAt: subscription.ended_at,
                    billingCycleAnchor: subscription.billing_cycle_anchor,
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                });
                await dbReceipt[0].save({ session });

                // Check subscription status
                if (subscription.status !== "active") throw new Error(`Subscription failed with '${subscription.status}' status`);

                // Update user
                Object.assign(req.user, {
                    customerId: customer.id,
                    subscriptionId: dbReceipt[0]._id,
                    remainingEnrollmentCount: planConfig[plan].enrollmentCount,
                });
                await req.user.save({ session });

                return SuccessHandler(
                    {
                        subscription: await getStudentActivePlan(dbReceipt[0]),
                        remainingEnrollmentCount: planConfig[plan].enrollmentCount,
                    },
                    200,
                    res,
                    "Subscribed successfully!"
                );
            });
            session.endSession();
        } catch (error) {
            console.error("Error:", error.message); // Log only error message
            const status = error.message.includes("Invalid") || error.message.includes("failed") ? 400 : 500;
            return ErrorHandler(error.message, status, res);
        }
    },



    resubscribe: async (req, res) => {
        const { plan } = req.body;
        const { _id, customerId, firstName, lastName } = req.user || {};
        try {
            // Validate inputs
            validateInputResubscription({ plan, user: req.user });

            // Check if customer exists in Stripe
            await stripeInstance.customers.retrieve(customerId);

            // Start MongoDB transaction
            const session = await mongoose.startSession();
            let result;
            await session.withTransaction(async () => {
                // Create receipt in DB
                const [dbReceipt] = await Subscription.create(
                    [{ user: _id.toString(), customerId, priceId: planConfig[plan].priceId }],
                    { session }
                );
                // Create Stripe subscription
                const subscription = await stripeInstance.subscriptions.create({
                    customer: customerId,
                    items: [{ price: planConfig[plan].priceId }],
                    metadata: {
                        user: _id.toString(),
                        name: `${firstName} ${lastName}`,
                        dbReceipt: dbReceipt._id.toString(),
                    },
                    expand: ["latest_invoice.payment_intent"],
                });

                // Update receipt
                Object.assign(dbReceipt, {
                    status: subscription.status,
                    subscriptionId: subscription.id,
                    trailsEndAt: subscription.trial_end,
                    endsAt: subscription.ended_at,
                    billingCycleAnchor: subscription.billing_cycle_anchor,
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                });
                await dbReceipt.save({ session });

                // Check subscription status
                if (subscription.status !== "active") throw new Error(`Subscription failed with '${subscription.status}' status`);

                // Update user
                Object.assign(req.user, {
                    subscriptionId: dbReceipt._id,
                    remainingEnrollmentCount: planConfig[plan].enrollmentCount,
                });
                await req.user.save({ session });
                console.log('dbReceipt._id ===>', dbReceipt._id)

                result = {
                    subscription: await getStudentActivePlan(dbReceipt),
                    remainingEnrollmentCount: planConfig[plan].enrollmentCount,
                };
            });

            session.endSession();
            return SuccessHandler(result, 200, res, "You've reactivated plan successfully!");
        } catch (error) {
            console.error("Error:", error.message); // Log only error message
            const status = error.message.includes("Invalid") || error.message.includes("failed") ? 400 : 500;
            return ErrorHandler(
                error.type === "StripeInvalidRequestError" ? "Invalid customer or payment details" : error.message,
                status,
                res
            );
        }
    },

    updateSubscriptionPlan: async (req, res) => {
        const { newPlan } = req.body;
        
        const { subscriptionId, _id: userId, customerId, firstName, lastName } = req.user || {};
        console.log('userId ===>',userId)
        try {
          
            // Validate inputs
            validateInputForPlanUpgration({ newPlan, user: req.user });
            // Start MongoDB transaction
            const session = await mongoose.startSession();
            let result;
            await session.withTransaction(async () => {
                // Retrieve current subscription from DB
                const currentSubscriptionReceipt = await Subscription.findById(subscriptionId).lean();
                if (!currentSubscriptionReceipt) throw new Error("Subscription not found");
                if (currentSubscriptionReceipt.user.toString() !== userId.toString()) throw new Error("Unauthorized: You do not own this subscription");

                // Get plan configuration
                const planDetails = planConfig[newPlan];
                if (!planDetails) throw new Error("Invalid plan configuration");

                const { priceId: updatedPriceId, enrollmentCount: remainingEnrollmentCount } = planDetails;

                // Prevent updating to the same plan
                if (currentSubscriptionReceipt.priceId === updatedPriceId) {
                    throw new Error(`Already subscribed to ${newPlan} plan`);
                }

                // Retrieve current Stripe subscription
                const currentStripeSubscription = await stripeInstance.subscriptions.retrieve(
                    currentSubscriptionReceipt.subscriptionId
                );

                // Create new subscription receipt in DB
                const [dbReceipt] = await Subscription.create(
                    [{ user: userId, customerId, priceId: updatedPriceId, status: "pending" }],
                    { session }
                );
console.log('dbReceipt._id ===>',dbReceipt._id)
                // Update Stripe subscription
                const updatedSubscription = await stripeInstance.subscriptions.update(
                    currentSubscriptionReceipt.subscriptionId,
                    {
                        items: [{ id: currentStripeSubscription.items.data[0].id, price: updatedPriceId }],
                        metadata: {
                            user: userId.toString(),
                            name: `${firstName} ${lastName}`,
                            dbReceipt: dbReceipt._id.toString(),
                        },
                        proration_behavior: "none",
                        billing_cycle_anchor: "now",
                    }
                );
// console.log('udpatedSubscription ==>',updatedSubscription)
                // Update DB receipt with Stripe data
                await Subscription.updateOne(
                    { _id: dbReceipt._id },
                    {
                        status: updatedSubscription.status,
                        subscriptionId: updatedSubscription.id,
                        trailsEndAt: updatedSubscription.trial_end,
                        endsAt: updatedSubscription.ended_at,
                        billingCycleAnchor: updatedSubscription.billing_cycle_anchor,
                        currentPeriodStart: updatedSubscription.current_period_start,
                        currentPeriodEnd: updatedSubscription.current_period_end,
                    },
                    { session }
                );

                // Check if subscription update was successful
                if (updatedSubscription.status !== "active") {
                    throw new Error(`Subscription update failed with '${updatedSubscription.status}' status`);
                }

                // Update user with new subscription details
                await req.user.updateOne(
                    { subscriptionId: dbReceipt._id, remainingEnrollmentCount },
                    { session }
                );
  console.log('req.user ===>',req.user)
                // Mark previous subscription as updated
                await Subscription.updateOne(
                    { _id: currentSubscriptionReceipt._id },
                    { status: "updated-to-other-plan" },
                    { session }
                );

                // Fetch updated subscription details
                result = {
                    subscription: await getStudentActivePlan(dbReceipt),
                    remainingEnrollmentCount,
                    user:req.user
                };

            });

            session.endSession();
            return SuccessHandler(result, 200, res, `Successfully updated plan to ${newPlan}!`);
        } catch (error) {
            console.error("Error updating subscription:", error.message);
            const status = error.message.includes("Invalid") || error.message.includes("failed") || error.message.includes("Unauthorized") ? 400 : 500;
            return ErrorHandler(
                error.type === "StripeInvalidRequestError" ? "Invalid subscription or payment details" : error.message,
                status,
                res
            );
        }
    },
    cancelSubscription: async (req, res) => {
        const { subscriptionId } = req.user; // Extract subscriptionId from authenticated user

        // Input validation
        if (!validateObjectId(subscriptionId)) {
            return ErrorHandler('Invalid subscription ID', 400, res);
        }

        try {
            // Fetch subscription from DB with lean() for performance
            const subscription = await Subscription.findById(subscriptionId).lean();
            if (!subscription) {
                return ErrorHandler('No active subscription found', 404, res);
            }

            console.log('subscription ===>', subscription)
            // Check if subscription is already canceled
            if (subscription.status === 'canceled') {
                return ErrorHandler('Subscription already canceled', 400, res);
            }

            // Cancel subscription via Stripe service
            const canceledSubscription = await stripeInstance.subscriptions.cancel(
                subscription.subscriptionId, // This is stripe subscription id.
                { prorate: false }
            );


            // Verify cancellation status
            if (canceledSubscription.status !== 'canceled') {
                console.warn(`Failed to cancel subscription. Status: ${canceledSubscription.status}`);
                return ErrorHandler(`Failed to cancel subscription. Status: ${canceledSubscription.status}`, 400, res);
            }

            // Update user and subscription in a transaction to ensure consistency
            await Student.findByIdAndUpdate(req.user._id, {
                subscriptionId: null,
                remainingEnrollmentCount: 0,
            }, { runValidators: true });

            await Subscription.findByIdAndUpdate(subscriptionId, {
                status: canceledSubscription.status,
                updatedAt: new Date(),
            }, { runValidators: true });

            // Log success
            console.info(`Subscription ${subscriptionId} canceled for user ${req.user._id}`);

            return SuccessHandler({
                subscription: {status:'canceled'},
                remainingEnrollmentCount: 0,
            }, 200, res, 'Subscription canceled successfully');
        } catch (error) {
            // Log error with context
            console.error(`Error canceling subscription ${subscriptionId}: ${error.message}`, { error, userId: req.user._id });
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    // Payment Methods
    getPaymentMethods: async (req, res) => {
        const { details } = req.query;
        const { customerId, _id: userId } = req.user; // Extract customerId and userId from authenticated user

        // Validate inputs
        if (!validateObjectId(userId) || !customerId) {
            return ErrorHandler('Invalid user or customer ID', 400, res);
        }

        try {
            // Retrieve customer from Stripe
            const customer = await stripeInstance.customers.retrieve(req.user.customerId);
            if (!customer) {
                console.info(`No customer found for user ${userId}`);
                return SuccessHandler([], 200, res, 'No payment methods found for this user');
            }

            const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

            // List payment methods
            const paymentMethods = await await stripeInstance.paymentMethods.list({ customer: customerId });
            let paymentMethodsData = paymentMethods.data;

            // If no default payment method, set the most recent one as default
            if (paymentMethodsData.length > 0 && !defaultPaymentMethodId) {
                const recentPaymentMethod = paymentMethodsData
                    .sort((a, b) => b.created - a.created)[0];

                await stripeInstance.paymentMethods.update(recentPaymentMethod.id, {
                    metadata: { isDefault: 'true' }
                });
                await stripeInstance.customers.update(req.user.customerId, {
                    invoice_settings: { default_payment_method: recentPaymentMethod.id }
                });

                // Refresh payment method data after update
                const updatedPaymentMethod = await stripeInstance.paymentMethods.retrieve(recentPaymentMethod.id);
                paymentMethodsData = paymentMethodsData.map(pm =>
                    pm.id === updatedPaymentMethod.id ? updatedPaymentMethod : pm
                );
            }

            // Map payment methods to response format
            const paymentMethodArr = paymentMethodsData
                .map(pm => ({
                    paymentMethodId: pm.id,
                    brand: pm.card?.brand ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1) : 'Unknown',
                    last4: pm.card?.last4 || 'N/A',
                    expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : 'N/A',
                    isDefault: pm.id === defaultPaymentMethodId,
                    created: details ? pm.created : undefined,
                }))
                .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

            console.info(`Retrieved ${paymentMethodArr.length} payment methods for user ${userId}`);
            return SuccessHandler(paymentMethodArr, 200, res, 'Payment methods retrieved successfully');
        } catch (error) {
            console.error(`Error retrieving payment methods for user ${userId}: ${error.message}`, { error, customerId });
            const status = error.type === 'StripeInvalidRequestError' ? 400 : 500;
            return ErrorHandler(
                error.type === 'StripeInvalidRequestError' ? 'Invalid customer or payment details' : 'Internal server error',
                status,
                res
            );
        }
    },

    addNewPaymentMethod: async (req, res) => {
        const { customerId, _id: userId } = req.user;
        const { paymentMethodId, setDefaultPaymentMethodFlag } = req.body;

        // Input validation
        if (!validateObjectId(userId) || !customerId) {
            return ErrorHandler('Invalid user or customer ID', 400, res);
        }
        if (!paymentMethodId || typeof setDefaultPaymentMethodFlag !== 'boolean') {
            return ErrorHandler('Invalid payment method ID or default flag', 400, res);
        }

        try {
            // Attach payment method to customer
            const paymentMethod = await attachPaymentMethod(paymentMethodId, customerId);

            // Set as default if requested
            if (setDefaultPaymentMethodFlag) {
                await Promise.all([
                    updateCustomer(customerId, {
                        invoice_settings: { default_payment_method: paymentMethodId },
                    }),
                    updatePaymentMethod(paymentMethodId, {
                        metadata: { isDefault: 'true' },
                    }),
                ]);
            }

            // Format response
            const newPaymentMethod = {
                paymentMethodId: paymentMethod.id,
                brand: paymentMethod.card?.brand
                    ? paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1)
                    : 'Unknown',
                last4: paymentMethod.card?.last4 || 'N/A',
                expiry: paymentMethod.card ? `${paymentMethod.card.exp_month}/${paymentMethod.card.exp_year}` : 'N/A',
                isDefault: setDefaultPaymentMethodFlag || paymentMethod.metadata?.isDefault === 'true',
            };

            return SuccessHandler(newPaymentMethod, 200, res, `Card ending in ${newPaymentMethod.last4} added successfully`);
        } catch (error) {
            logger.error(`Error adding payment method for user ${userId}: ${error.message}`, { error, customerId });
            const status = error.type === 'StripeInvalidRequestError' ? 400 : 500;
            return ErrorHandler(
                error.type === 'StripeInvalidRequestError' ? 'Invalid payment method or customer details' : 'Internal server error',
                status,
                res
            );
        }
    },

    detachPaymentMethod: async (req, res) => {
        try {
            const { customerId } = req.user;
            const { id: paymentMethodId } = req.params;

            if (!customerId || !paymentMethodId) {
                return ErrorHandler("Stripe customer ID and payment method ID are required", 400, res);
            }

            const { data: paymentMethods } = await stripeInstance.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
            if (!paymentMethod) return ErrorHandler("Payment method not found", 404, res);

            // Handle default card logic
            if (paymentMethod.metadata?.isDefault === 'true') {
                const recentPaymentMethod = paymentMethods
                    .filter(pm => pm.id !== paymentMethodId)
                    .sort((a, b) => b.created - a.created)[0];

                if (!recentPaymentMethod) {
                    return ErrorHandler("No alternative payment methods available to set as default", 400, res);
                }

                await stripeInstance.paymentMethods.update(recentPaymentMethod.id, {
                    metadata: { isDefault: 'true' },
                });
            }

            await stripeInstance.paymentMethods.detach(paymentMethodId);
            return SuccessHandler({ removed: paymentMethodId }, 200, res, "Payment method removed successfully");

        } catch (error) {
            return ErrorHandler(error.message || 'Internal server error', 500, res);
        }
    },

    setCardAsDefault: async (req, res) => {
        try {
            const customerId = req.user?.customerId;
            const paymentMethodId = req.params?.id;
            if (!customerId || !paymentMethodId)
                return ErrorHandler("Customer ID & Payment Method ID required", 400, res);

            await stripeInstance.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId }
            });

            const pm = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
            if (!pm?.card) return ErrorHandler("Invalid payment method", 404, res);

            return SuccessHandler(
                { defaultPaymentMethod: pm.id },
                200,
                res,
                `****${pm.card.last4} set as default`
            );
        } catch (err) {
            return ErrorHandler(err.message || "Internal server error", 500, res);
        }
    }
    ,



    // Invoices
    getAllInvoices: async (req, res) => {
        try {
            const { customerId } = req.user;
            let { paid ,length} = req.query;
            let page = 'undefined'
            if (!customerId) return ErrorHandler("Not registered on stripe!", 400, res);



            let params = {
                customer: customerId,
                status: paid ? "paid" : undefined,
                limit: length ? length : 10,
            };

            if (page !== 'undefined') {
                params.starting_after = page;
            }

            const invoiceList = await stripeInstance.invoices.list(params);


            const invoices = invoiceList.data.map((i) => {
                const { paid_at } = i.status_transitions;
                const line = i.lines.data[0];

                return {
                    invoice_id: i.id,
                    customer_id: i.customer,
                    subscription_id: i.subscription,
                    amount_due: i.amount_due,
                    amount_paid: i.amount_paid,
                    amount_remaining: i.amount_remaining,
                    invoice_status: toTitleCase(i.status),
                    price_id: line.price.id,
                    plan_details: planDetails(line.price.id),
                    paid_status: i.paid,
                    issue_date: convertTimestamp(i.created),
                    due_date: i.due_date ? convertTimestamp(i.due_date) : "N/A",
                    paid_at: paid_at ? convertTimestamp(paid_at) : "N/A",
                    amount: (i.amount_due / 100).toFixed(2),
                };
            });


console.log('invoices ===>',invoices.length)
            return SuccessHandler(
                { invoices, has_more: invoiceList.has_more },
                200,
                res,
                "Invoices retrieved!"
            );
        } catch (err) {
            return ErrorHandler(err.message || "Internal server error", 500, res);
        }
    },
    getInvoice: async (req, res) => {
        const id = req.params.id;
        try {
            if (!id) return ErrorHandler('ID is required', 400, res);
            const invoice = await stripeInstance.invoices.retrieve(id, {
                expand: [
                    'customer',
                    'payment_intent',
                    'subscription',
                    'subscription.plan',
                    'lines.data.price.product',
                    'customer.invoice_settings.default_payment_method',
                    'payment_intent.payment_method',
                ]
            });
            if (!invoice) return ErrorHandler('Invoice does not exist', 400, res);
            return SuccessHandler(invoice, 200, res, 'Invoice retrieved successfully');
        } catch (error) {
            console.log('error', error);
            return ErrorHandler("Internal server error", 400, res);
        }
    },
    payInvoice: async (req, res) => {
        const { invoiceId, paymentMethodId } = req.body;

        try {
            const invoice = await stripeInstance.invoices.retrieve(invoiceId);

            if (invoice.status !== 'open') {
                return ErrorHandler('Invoice is not open', 400, res);
            }

            let paymentMethodToUse = paymentMethodId;

            if (!paymentMethodToUse) {
                // Retrieve the customer to get the default payment method
                const customer = await stripeInstance.customers.retrieve(invoice.customer);

                // Check if the customer has a default payment method
                if (!customer.invoice_settings.default_payment_method) {
                    return ErrorHandler('No payment method provided and no default payment method set for customer', 400, res);
                }

                // Use the default payment method
                paymentMethodToUse = customer.invoice_settings.default_payment_method;
            }


            // Create a payment intent for the invoice amount
            const paymentIntent = await stripeInstance.paymentIntents.create({
                amount: invoice.amount_remaining,
                currency: invoice.currency,
                customer: invoice.customer,
                payment_method: paymentMethodToUse,
                confirm: true,
                off_session: true,
            });


            // If Payment doesn't succeed, throw error.
            if (paymentIntent.status !== 'succeeded') {
                return ErrorHandler('Payment failed', 400, res);
            }

            // Mark invoice as paid.
            await stripeInstance.invoices.pay(invoiceId);


            // Get all invoices which have 'open' status with this subscription id.
            let invoicesWithThisSubID = await stripeInstance.invoices.list({
                status: 'open',
                subscription: invoice.subscription
            })

            // Initialize response
            let resp;

            // If there is no 'open' invoice associated with this subscription id, update db status.
            if (invoicesWithThisSubID.data.length === 0) {

                const subscriptionPaid = await stripeInstance.subscriptions.retrieve(invoice.subscription);

                const dbReceipt = await Subscription.create({
                    user: req.user._id,
                    status: subscriptionPaid.status,
                    subscriptionId: subscriptionPaid.id,
                    customerId: invoice.customer,
                    priceId: subscriptionPaid.items.data[0].price.id,
                    trailsEndAt: subscriptionPaid.trial_end,
                    endsAt: subscriptionPaid.ended_at,
                    billingCycleAnchor: subscriptionPaid.billing_cycle_anchor, // New added (7/8/24)
                    currentPeriodStart: subscriptionPaid.current_period_start, // New added (7/8/24)
                    currentPeriodEnd: subscriptionPaid.current_period_end // New added (7/8/24)
                });

                const activePlan = await getStudentActivePlan(dbReceipt)

                resp = {
                    subscription: activePlan,
                    remainingEnrollmentCount: activePlan.courseLimit // Initially course will have the max remaining count.
                }

                req.user.subscriptionId = dbReceipt._id;
                req.user.remainingEnrollmentCount = activePlan.courseLimit;
                await req.user.save();

            }


            return SuccessHandler(resp, 200, res, `Invoice paid!`);
        } catch (error) {
            if (error.type === 'StripeCardError') {
                return ErrorHandler(error.message, 500, res, { errorType: error.type });
            }

            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getStats: async (req, res) => {
        let allInvoices = [];
        let hasMore = true;
        const { customerId } = req.user;
        let page = 'undefined'

        try {
            if (!customerId) return ErrorHandler("No customer id", 500, res);
            while (hasMore) {
                const params = {
                    customer: customerId,
                    limit: 100, // max allowed by Stripe
                };
                if (page !== 'undefined') params.starting_after = page;

                const invoiceList = await stripeInstance.invoices.list(params);
                console.log('invoiceList ===>', invoiceList)
                allInvoices.push(...invoiceList.data);
                console.log('AllInvioces ====>', allInvoices)

                if (invoiceList.has_more) {
                    page = invoiceList.data[invoiceList.data.length - 1].id;
                } else {
                    console.log('haMore ==>', hasMore);
                    hasMore = false;
                }

            }

            const stats = {
                total: allInvoices.length,
                paid: allInvoices.filter(i => i.status === 'paid').length
            }


            // DB me aggregated stats fetch karo
            return SuccessHandler(
                stats,
                200,
                res,
                "Invoices retrieved!"
            );
        } catch (err) {
            return ErrorHandler(err.message || "Internal server error", 500, res);
        }
    },


    // Webhook 
    webhook: async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.WB_ENDPOINT_SECRET;

        let event;

        try {
            event = stripeInstance.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }



   

        console.log('event.type ===>', event.type)
        switch (event.type) {
            // SUBCRIPTION: CREATED
            case 'customer.subscription.created':
                console.log('Subscription created:', event.data.object);
                break;
            // SUBCRIPTION: UPDATED
            case 'customer.subscription.updated':
                console.log('Subscription updated:', event.data.object.id);
                await onUpdatedSubscription(event.data.object);
                break;
            case 'payment_intent.succeeded':
                const payment = event.data.object;
                console.log('payment ===>', payment)
                totalSpendings += payment.amount / 100; // convert cents to dollars
                break;
            case 'invoice.paid':
                totalInvoices += 1;
                break;
            case 'invoice.created':
                stats.totalInvoices += 1;
                stats.pendingCount += 1;
                stats.totalRevenue += event.data.object.amount_due / 100;
                break;

            case 'invoice.paid':
                stats.paidCount += 1;
                stats.pendingCount -= 1;
                break;

            case 'invoice.payment_failed':
                stats.pendingCount -= 1;
                stats.overdueCount += 1;
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Return a response to acknowledge receipt of the event
        res.json({ received: true });
    },





};

export default paymentController;


/* ===================== Subscription obj =====================
const subscriptionObj = {
    user: req.user._id,
    status: subscription.status,
        subscriptionId: subscription.id,
        customerId: customerId,
        priceId: priceId,
        trailsEndAt: subscription.trial_end,
        endsAt: subscription.ended_at,
    }
    
*/


/* ===================== BUY SUBSCRIPTION METHOD (CREATE + UPDATE) =====================
    buySubscription: async (req, res) => {
    const { plan } = req.body;
    let { customerId } = req.user;
    try {

        // Check if the customer is created:
        if (!customerId) {
            const { paymentMethodId } = req.body;
            const { _id, email, firstName, lastName } = req.user;
            if (!paymentMethodId) return ErrorHandler("Payment id required!", 400, res);

            const customer = await stripeInstance.customers.create({
                email: email,
                name: `${firstName} ${lastName}`,
                payment_method: paymentMethodId,
                invoice_settings: { default_payment_method: paymentMethodId },
                metadata: { userId: _id }
            });

            req.user.customerId = customer.id;
            await req.user.save();

            customerId = customer.id;
        }


        // Set price id according to plan:
        let priceId = '';
        let remainingEnrollmentCount = 0;
        if (plan === 'Bronze') {
            priceId = 'price_1P6ep6EdtHnRsYCMarT5ATUq';
            remainingEnrollmentCount = 4;
        } else if (plan === 'Silver') {
            priceId = 'price_1P6eq0EdtHnRsYCMGORU2F9n';
            remainingEnrollmentCount = 8;
        } else if (plan === 'Gold') {
            priceId = 'price_1P6eqPEdtHnRsYCMSV1ln2lh';
            remainingEnrollmentCount = 12;
        } else {
            return ErrorHandler("Invalid plan!", 400, res);
        }


        // Create subscription on Stripe
        const subscription = await stripeInstance.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            metadata: { user: req.user._id },
            expand: ['latest_invoice.payment_intent']
        });

        switch (subscription.status) {
            case 'active':
                // if (subscription.latest_invoice.payment_intent.status === 'succeeded') {
                //     await Subscription.create({
                //         user: req.user._id,
                //         status: subscription.status,
                //         subscriptionId: subscription.id,
                //         customerId: customerId,
                //         priceId: priceId,
                //         trailsEndAt: subscription.trial_end,
                //         endsAt: subscription.ended_at,
                //     })

                //     const subscriptions = await Subscription.find({ user: req.user._id });
                //     return SuccessHandler(subscriptions, 200, res, "Subscribed successfully!");
                // } else {
                //     return ErrorHandler("Subscription active but payment failed!", 400, res);
                // }
                const subscriptionCopy = await Subscription.create({
                    user: req.user._id,
                    status: subscription.status,
                    subscriptionId: subscription.id,
                    customerId: customerId,
                    priceId: priceId,
                    trailsEndAt: subscription.trial_end,
                    endsAt: subscription.ended_at,
                })


                req.user.subscriptionId = subscriptionCopy._id;
                req.user.remainingEnrollmentCount = remainingEnrollmentCount;
                await req.user.save();

                let subscriptions = await Subscription.find({
                    $and: [
                        { user: req.user._id },
                        { status: 'active' }
                    ]
                });
                let activePlan = subscriptions.length > 0 ? subscriptions[0] : null;

                if (activePlan) {
                    activePlan = {
                        _id: activePlan._id,
                        ...planDetails(activePlan.priceId),
                        user: activePlan.user,
                        status: activePlan.status,
                        subscriptionId: activePlan.subscriptionId,
                        customerId: activePlan.customerId,
                        priceId: activePlan.priceId,
                        trailsEndAt: activePlan.trailsEndAt,
                        endsAt: activePlan.endsAt,
                        createdAt: activePlan.createdAt,
                        updatedAt: activePlan.updatedAt,
                    }

                }

                return SuccessHandler({ subscription: activePlan, remainingEnrollmentCount }, 200, res, "Subscribed successfully!");
            case 'incomplete':
                return ErrorHandler("Subscription setup is incomplete.", 400, res);
            case 'incomplete_expired':
                return ErrorHandler("Subscription setup expired.", 400, res);
            case 'past_due':
                return ErrorHandler("Subscription payment is past due.", 400, res);
            case 'canceled':
                return ErrorHandler("Subscription is canceled.", 400, res);
            case 'unpaid':
                return ErrorHandler("Subscription payment is unpaid.", 400, res);
            default:
                return ErrorHandler("Unknown subscription status.", 400, res);
        }
    } catch (error) {
        console.error("Error:", error);
        return ErrorHandler('Internal server error', 500, res);
    }
},
*/


/* =========== BUY SUBSCRIPTION SCENARIOS ===========

        // Scenario 1: Creating customer for the first time + adding a payment method
        if (!customerId && paymentMethodId) {
            const { _id, email, firstName, lastName } = req.user;

            const customer = await stripeInstance.customers.create({
                email: email,
                name: `${firstName} ${lastName}`,
                payment_method: paymentMethodId,
                invoice_settings: { default_payment_method: paymentMethodId },
                metadata: { userId: _id }
            });

            req.user.customerId = customer.id;
            await req.user.save();

            customerId = customer.id;
        }
        
        
        // Scenario 2: Customer is already created and using its attached payment method
        else if (customerId && !paymentMethodId) {
            // Customer exists, no new payment method provided, proceed with existing one
        } 


        // Scenario 3: Customer and payment method exist, now adding a new payment method
        else if (customerId && paymentMethodId) {
            // Attach the new payment method to the customer
            await stripeInstance.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });
            // Update the default payment method
            await stripeInstance.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });
        } 
        else {
            return ErrorHandler("Invalid request! Please provide payment method.", 400, res);
        }


*/

/* =========== INITIATE PAYMENT ===========

const initiatePayment = async (customerId, priceId, paymentMethodId) => {
  const price = await stripe.prices.retrieve(priceId);
  const amount = price.unit_amount;

  const paymentIntent = await stripe.paymentIntents.create({
    customer: customerId,
    amount: amount,
    currency: price.currency,
    payment_method: paymentMethodId, // Specify the payment method to use
    confirm: true,
  });

  return paymentIntent;
};


*/


/* =========== SUBSCRIPTION WITH PAYMENT METHODS ===========

const subscription = await stripeInstance.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId ? paymentMethodId : 'default', // Use provided payment method or default if not specified
    metadata: { user: req.user._id },
    expand: ['latest_invoice.payment_intent']
});

*/



/* =================== NOT IN USE ======================
    // ------- TESTING: PAYMENT INTENTS -------
    paymentConfig: async (req, res) => {
        res.send({
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        });
    },
    createPaymentIntent: async (req, res) => {
        try {
            const paymentIntent = await stripeInstance.paymentIntents.create({
                currency: "EUR",
                amount: 1999,
                automatic_payment_methods: { enabled: true },
            });

            // Send publishable key and PaymentIntent details to client
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        } catch (e) {
            return res.status(400).send({
                error: {
                    message: e.message,
                },
            });
        }
    },
    createSubscriptionPaymentIntent: async (req, res) => {
        try {
            const { priceId } = req.body; // Assuming priceId is sent from the client-side

            // Retrieve the product and price details from Stripe using the provided priceId
            const price = await stripeInstance.prices.retrieve(priceId);

            // Create the PaymentIntent for the subscription
            const paymentIntent = await stripeInstance.paymentIntents.create({
                payment_method_types: ['card'], // Assuming card payments
                amount: price.unit_amount, // The amount should be in the lowest denomination of the currency (e.g., cents for EUR)
                currency: price.currency,
                description: 'Subscription Payment', // Add description if needed
                setup_future_usage: 'off_session', // This ensures that the PaymentIntent can be used for off-session payments (e.g., subscriptions)
                metadata: {
                    // Add any metadata you want to associate with the PaymentIntent
                    // For example, you can store user ID, subscription ID, etc.
                    // metadata_key: metadata_value,
                },
            });

            // Send client secret and PaymentIntent details to the client
            res.send({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            });
        } catch (e) {
            return res.status(400).send({
                error: {
                    message: e.message,
                },
            });
        }
    },
    // ------ NOT IN USE ------
    createCustomer: async (req, res) => {
        const { paymentMethodId } = req.body;
        const { _id, email, firstName, lastName, customerId } = req.user;

        try {

            if (customerId) {
                return ErrorHandler(`Customer details exist already, Customer id: ${customerId}`, 400, res);
            }

           
            // Create Customer
            const customer = await stripeInstance.customers.create({
                email: email,
                name: `${firstName} ${lastName}`,
                // source: "tok_mastercard", // instead of token.
                payment_method: paymentMethodId, // Use the provided token as the default payment method
                invoice_settings: {
                    default_payment_method: paymentMethodId, // Set the provided token as the default payment method for future invoices
                },
                metadata: {
                    userId: _id,
                },
            });

            req.user.customerId = customer.id;
            await req.user.save();

            return SuccessHandler({ customerId: customer.id }, 200, res, 'Customer created!');
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }

*/





/* =============================== BACKUP SUBSCRIBE METHOD 
    subscribe: async (req, res) => {
        const { plan, paymentMethodId } = req.body;
        const { _id, email, firstName, lastName } = req.user;

        if (!plan || !paymentMethodId) {
            return ErrorHandler("Plan & payment method id both are required!", 400, res);
        }

        const customer = await stripeInstance.customers.create({
            email: email,
            name: `${firstName} ${lastName}`,
            payment_method: paymentMethodId,
            invoice_settings: { default_payment_method: paymentMethodId },
            metadata: { userId: _id }
        });

        req.user.customerId = customer.id;
        await req.user.save();

        const customerId = customer.id;

        let priceId = '';
        let remainingEnrollmentCount = 0;


        switch (plan) {
            case 'Bronze':
                remainingEnrollmentCount = 4;
                priceId = process.env.BRONZE_PRICE_ID;
                break;
            case 'Silver':
                remainingEnrollmentCount = 8;
                priceId = process.env.SILVER_PRICE_ID;
                break;
            case 'Gold':
                remainingEnrollmentCount = 12;
                priceId = process.env.GOLD_PRICE_ID;
                break;
            default:
                return ErrorHandler("Invalid plan!", 400, res);
        }


        // Create subscription on Stripe
        const subscription = await stripeInstance.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            metadata: { user: req.user._id },
            expand: ['latest_invoice.payment_intent']
        });


        // If subscription fails
        if (subscription.status !== 'active') {
            return ErrorHandler(`Subscription creation failed with '${subscription.status}' status`, 400, res);
        }


        // Update db, if succeed
        const dbReceipt = await Subscription.create({
            user: req.user._id,
            status: subscription.status,
            subscriptionId: subscription.id,
            customerId: customerId,
            priceId: priceId,
            trailsEndAt: subscription.trial_end,
            endsAt: subscription.ended_at,
        })

        req.user.subscriptionId = dbReceipt._id;
        req.user.remainingEnrollmentCount = remainingEnrollmentCount;
        await req.user.save();

        let subscriptionsArr = await Subscription.find({ $and: [{ user: req.user._id }, { status: 'active' }] });

        let activedPlan = subscriptionsArr.length > 0 ? subscriptionsArr[0] : null;

        if (activedPlan) {
            activedPlan = {
                _id: activedPlan._id,
                ...planDetails(activedPlan.priceId),
                user: activedPlan.user,
                status: activedPlan.status,
                subscriptionId: activedPlan.subscriptionId,
                customerId: activedPlan.customerId,
                priceId: activedPlan.priceId,
                trailsEndAt: activedPlan.trailsEndAt,
                endsAt: activedPlan.endsAt,
                createdAt: activedPlan.createdAt,
                updatedAt: activedPlan.updatedAt,
            }
        }

        return SuccessHandler({ subscription: activedPlan, remainingEnrollmentCount }, 200, res, "Subscribed successfully!");
    },


*/


/**************** upgradeSubscription **************************

const upgradeSubscription = async (subscriptionId, newPriceId) => {
    try {
        // Retrieve the subscription
        const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
        // Update the subscription with the new price ID
        await stripeInstance.subscriptions.update(subscriptionId, {
            items: [{
                id: subscription.items.data[0].id,
                price: newPriceId,
            }],
            proration_behavior: 'none',
        });
        console.log('Subscription upgraded successfully!');
    } catch (error) {
        console.error('Error upgrading subscription:', error);
    }
}

*/