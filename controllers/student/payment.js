import stripe from "stripe";
import Student from "../../models/student.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import Subscription from "../../models/subscription.js";
import { getStudentActivePlan, planDetails, toTitleCase } from "../../utils/functions/HelperFunctions.js";
import axios from "axios";
import fetch from "node-fetch";

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
// --- CONFIG ---
const GEOAPIFY_API_KEY = '48952f3cc9f1434093c566c52b951424';
const HUNTER_API_KEY = 'YOUR_HUNTER_KEY';
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
const totalInvoices = 0;
const totalSpendings = 0;

const paymentController = {

    // Subscription
    subscribe: async (req, res) => {
        const { _id, email } = req.user;
        const { plan, paymentMethodId } = req.body;
        console.log('_id ===>', _id)
        if (!plan || !paymentMethodId) {
            return ErrorHandler("Plan & payment method id both are required!", 400, res);
        }

        console.log('paymentMethodId ===>', paymentMethodId)
        // Creating customer on stripe and save id to our db.
        const customer = await stripeInstance.customers.create({
            email: email,
            name: `${req.user.firstName} ${req.user.lastName}`,
            payment_method: paymentMethodId,
            invoice_settings: { default_payment_method: paymentMethodId },
            metadata: { userId: _id.toString() }
        });
        console.log('paymentMethodId  code check ===>', paymentMethodId)
        const customerId = customer.id;
        req.user.customerId = customerId;
        await req.user.save();


        // Setting plan price with course limit.
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
            case 'Daily':
                remainingEnrollmentCount = 2;
                priceId = process.env.DAILY_PRICE_ID;
                break;
            default:
                return ErrorHandler("Invalid plan!", 400, res);
        }
        const price = await stripeInstance.prices.retrieve(priceId);
        console.log('price ===>', price);

        // Create reciept in db (Maybe changed later, Yasir bhai said don't drop entry until subscription gets active.)
        const dbReceipt = await Subscription.create({
            user: req.user._id,
            customerId: customerId,
            priceId: priceId,
        })

        // Create subscription on Stripe
        const subscription = await stripeInstance.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            metadata: {
                user: req.user._id.toString(),
                name: `${req.user.firstName} ${req.user.lastName}`,
                dbReceipt: dbReceipt._id.toString()
            },
            expand: ['latest_invoice.payment_intent']
        });

        // Update reciept
        dbReceipt.status = subscription.status;
        dbReceipt.subscriptionId = subscription.id;
        dbReceipt.trailsEndAt = subscription.trial_end;
        dbReceipt.endsAt = subscription.ended_at;
        dbReceipt.billingCycleAnchor = subscription.billing_cycle_anchor; // New added (7/8/24)
        dbReceipt.currentPeriodStart = subscription.current_period_start; // New added (7/8/24)
        dbReceipt.currentPeriodEnd = subscription.current_period_end; // New added (7/8/24)
        await dbReceipt.save();


        // If subscription fails, stop process and send error.
        if (subscription.status !== 'active') {
            return ErrorHandler(`Subscription creation failed with '${subscription.status}' status`, 400, res);
        }

        req.user.subscriptionId = dbReceipt._id;
        req.user.remainingEnrollmentCount = remainingEnrollmentCount;
        await req.user.save();

        return SuccessHandler({
            subscription: await getStudentActivePlan(dbReceipt),
            remainingEnrollmentCount
        }, 200, res, "Subscribed successfully!");
    },

    resubscribe: async (req, res) => {
        const { plan } = req.body;
        try {
            if (!plan) {
                return ErrorHandler("Plan is required!", 400, res);
            }

            // Setting plan price with course limit.
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
                case 'Daily':
                    remainingEnrollmentCount = 2;
                    priceId = process.env.DAILY_PRICE_ID;
                    break;
                default:
                    return ErrorHandler("Invalid plan!", 400, res);
            }

            const customer = await stripeInstance.customers.retrieve(req.user.customerId);
            console.log('customer ===>', customer);
            // Create reciept in db.
            const dbReceipt = await Subscription.create({
                user: req.user._id,
                customerId: req.user.customerId,
                priceId: priceId,
            })


            // Create subscription on Stripe
            const subscription = await stripeInstance.subscriptions.create({
                customer: req.user.customerId,
                items: [{ price: priceId }],
                metadata: {
                    user: req.user._id.toString(),
                    name: `${req.user.firstName} ${req.user.lastName}`,
                    dbReceipt: dbReceipt._id.toString()
                },
                expand: ['latest_invoice.payment_intent']
            });

            // Update reciept
            dbReceipt.status = subscription.status;
            dbReceipt.subscriptionId = subscription.id;
            dbReceipt.trailsEndAt = subscription.trial_end;
            dbReceipt.endsAt = subscription.ended_at;
            dbReceipt.billingCycleAnchor = subscription.billing_cycle_anchor; // New added (7/8/24)
            dbReceipt.currentPeriodStart = subscription.current_period_start; // New added (7/8/24)
            dbReceipt.currentPeriodEnd = subscription.current_period_end; // New added (7/8/24)
            await dbReceipt.save();


            if (subscription.status !== 'active') {
                return ErrorHandler(
                    `Subscription creation failed with '${subscription.status}' status`,
                    400,
                    res,
                    {
                        subscription: await getStudentActivePlan(dbReceipt),
                        remainingEnrollmentCount
                    }
                );
            }

            req.user.subscriptionId = dbReceipt._id;
            req.user.remainingEnrollmentCount = remainingEnrollmentCount;
            await req.user.save();

            return SuccessHandler({
                subscription: await getStudentActivePlan(dbReceipt),
                remainingEnrollmentCount
            }, 200, res, "You've reactived plan successufully!");
        } catch (error) {
            console.log("Error: ", error)
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    updateSubscriptionPlan: async (req, res) => {
        const { newPlan } = req.body;
        const { subscriptionId } = req.user; // Subscription id

        try {
            if (!newPlan) {
                return ErrorHandler("Plan & payment method id both are required!", 400, res);
            }
            // Retrieve the current subscription from our db record.
            let currentSubscriptionReceipt = await Subscription.findById(subscriptionId);

            if (currentSubscriptionReceipt.user.toString() !== req.user._id.toString()) {
                return ErrorHandler("You does not own this subscription!", 401, res);
            }

            let updatedPriceId = '';
            let remainingEnrollmentCount = 0;
            switch (newPlan) {
                case 'Bronze':
                    remainingEnrollmentCount = 4;
                    updatedPriceId = process.env.BRONZE_PRICE_ID;
                    break;
                case 'Silver':
                    remainingEnrollmentCount = 8;
                    updatedPriceId = process.env.SILVER_PRICE_ID;
                    break;
                case 'Gold':
                    remainingEnrollmentCount = 12;
                    updatedPriceId = process.env.GOLD_PRICE_ID;
                    break;
                case 'Daily':
                    remainingEnrollmentCount = 2;
                    updatedPriceId = process.env.DAILY_PRICE_ID;
                    break;
                default:
                    return ErrorHandler("Invalid plan!", 400, res);
            }


            // Let's check if user wants to try updating the same plan on which he is.
            if (currentSubscriptionReceipt.priceId === updatedPriceId) {
                return ErrorHandler(`Already at ${newPlan} subscription.`, 400, res);
            }

            // Retrieve current subscription
            const currentStripeSubscription = await stripeInstance.subscriptions.retrieve(
                currentSubscriptionReceipt.subscriptionId // Stripe subscription id.
            );

            // Create new reciept in db and update current subscription
            const dbReceipt = await Subscription.create({
                user: req.user._id,
                customerId: req.user.customerId,
                priceId: updatedPriceId,
            })

            const updatedSubscription = await stripeInstance.subscriptions.update(
                currentSubscriptionReceipt.subscriptionId, // Stripe subscription id.
                {
                    items: [{
                        id: currentStripeSubscription.items.data[0].id,
                        price: updatedPriceId
                    }],
                    metadata: {
                        user: req.user._id.toString(),
                        name: `${req.user.firstName} ${req.user.lastName}`,
                        dbReceipt: dbReceipt._id.toString()
                    },
                    proration_behavior: 'none',
                    billing_cycle_anchor: 'now',
                }
            );

            // Update reciept
            dbReceipt.status = updatedSubscription.status;
            dbReceipt.subscriptionId = updatedSubscription.id;
            dbReceipt.trailsEndAt = updatedSubscription.trial_end;
            dbReceipt.endsAt = updatedSubscription.ended_at;
            dbReceipt.billingCycleAnchor = updatedSubscription.billing_cycle_anchor; // New added (7/8/24)
            dbReceipt.currentPeriodStart = updatedSubscription.current_period_start; // New added (7/8/24)
            dbReceipt.currentPeriodEnd = updatedSubscription.current_period_end; // New added (7/8/24)
            await dbReceipt.save();


            // If updation fails
            if (updatedSubscription.status !== 'active') {
                return ErrorHandler(`Subscription updation failed with '${updatedSubscription.status}' status`, 400, res);
            }

            req.user.subscriptionId = dbReceipt._id;
            req.user.remainingEnrollmentCount = remainingEnrollmentCount;
            await req.user.save();


            // Set previous subsription record status to 'updated'.
            currentSubscriptionReceipt.status = 'updated-to-other-plan';
            await currentSubscriptionReceipt.save();

            return SuccessHandler({
                subscription: await getStudentActivePlan(dbReceipt),
                remainingEnrollmentCount
            }, 200, res, `You've updated plan to ${newPlan}!`);

        } catch (error) {
            console.log("Error: ", error)
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    cancelSubscription: async (req, res) => {
        const { subscriptionId } = req.user; // Subscription id

        try {

            let currentSubscriptionReceipt = await Subscription.findById(subscriptionId);
            if (!currentSubscriptionReceipt) return ErrorHandler("You're not a subscriber!", 404, res);

            if (currentSubscriptionReceipt.status === 'canceled') {
                return ErrorHandler("Subscription already canceled!", 400, res);
            }

            const canceledSubscription = await stripeInstance.subscriptions.cancel(
                currentSubscriptionReceipt.subscriptionId, // This is stripe subscription id.
                { prorate: false }
            );

            if (canceledSubscription.status === 'canceled') {

                req.user.subscriptionId = null;
                req.user.subscriptionId = null;
                req.user.remainingEnrollmentCount = 0;
                await req.user.save();

                // Update the subscription reciept in db
                currentSubscriptionReceipt.status = canceledSubscription.status;
                await currentSubscriptionReceipt.save();

                return SuccessHandler({
                    subscription: null,
                    remainingEnrollmentCount: 0
                }, 200, res, `Subscription has been canceled.`);


            } else {
                return ErrorHandler(`Failed in canceling subscription with status ${canceledSubscription.status}!`, 400, res);
            }

        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },


    // Payment Methods
    getPaymentMethods: async (req, res) => {
        const { details } = req.query;
        try {
            if (!req.user.customerId) {
                return SuccessHandler([], 200, res, "No payment methods found for this user");
            }
            // Default Payment Method
            const customer = await stripeInstance.customers.retrieve(req.user.customerId);
            const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;
            // Retrieve payment methods`
            let paymentMethods = await stripeInstance.paymentMethods.list({ customer: req.user.customerId });
            let paymentMethodsData = paymentMethods.data;
            let recentPaymentMethod = paymentMethods.data
                .filter(pm => pm.id !== defaultPaymentMethodId)
                .sort((a, b) => new Date(b.created) - new Date(a.created))[0];
            if (recentPaymentMethod && !defaultPaymentMethodId) {
                await stripeInstance.paymentMethods.update(recentPaymentMethod.id, {
                    metadata: { isDefault: 'true' }
                });
                await stripeInstance.customers.update(req.user.customerId, {
                    invoice_settings: { default_payment_method: recentPaymentMethod.id }
                });
                const updatedPaymentMethod = await stripeInstance.paymentMethods.retrieve(recentPaymentMethod.id);
                const updatedPaymentMethodIndex = paymentMethods.data.findIndex((mthd) => mthd.id === updatedPaymentMethod.id);
                paymentMethodsData.splice(updatedPaymentMethodIndex, 1, updatedPaymentMethod);
                const paymentMethodArr = paymentMethodsData.map(pm => {
                    return {
                        paymentMethodId: pm.id,
                        brand: pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1),
                        last4: pm.card.last4,
                        expiry: `${pm.card.exp_month}/${pm.card.exp_year}`,
                        isDefault: pm.metadata.isDefault === 'true'
                    };
                }).sort((a, b) => b.isDefault - a.isDefault);
                return SuccessHandler(paymentMethodArr, 200, res, "Payment methods");
            }

            const paymentMethodArr = paymentMethods.data.map(pm => {
                return {
                    paymentMethodId: pm.id,
                    brand: pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1),
                    last4: pm.card.last4,
                    expiry: `${pm.card.exp_month}/${pm.card.exp_year}`,
                    isDefault: pm.id === defaultPaymentMethodId,
                    created: details && pm.created,

                };
            }).sort((a, b) => b.isDefault - a.isDefault);

            return SuccessHandler(paymentMethodArr, 200, res, "Payment methods");
        } catch (error) {
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    addNewPaymentMethod: async (req, res) => {
        const customerId = req.user.customerId;
        const { paymentMethodId, setDefaultPaymentMethodFlag } = req.body;

        try {
            if (!customerId) {
                return ErrorHandler("Stripe customer id not found!", 400, res);;
            }
            const paymentMethod = await stripeInstance.paymentMethods.attach(
                paymentMethodId, { customer: customerId }
            );

            if (setDefaultPaymentMethodFlag) {
                await stripeInstance.customers.update(customerId, {
                    invoice_settings: { default_payment_method: paymentMethodId }
                });

                await stripeInstance.paymentMethods.update(
                    paymentMethodId,
                    {
                        metadata: { isDefault: 'true' }
                    }
                );
            }

            // Default Payment Method
            const customer = await stripeInstance.customers.retrieve(customerId);
            const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;

            const newPaymentMethod = {
                paymentMethodId: paymentMethod.id,
                brand: paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1),
                last4: paymentMethod.card.last4,
                expiry: `${paymentMethod.card.exp_month}/${paymentMethod.card.exp_year}`,
                isDefault: paymentMethod.id === defaultPaymentMethodId
            }
            console.log('newPaymentMethod ===>', newPaymentMethod)

            return SuccessHandler(newPaymentMethod, 200, res, `${newPaymentMethod.last4} is successfully added to payment methods.`);
        } catch (error) {
            console.log('Error ==> ', error)
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    detachPaymentMethod: async (req, res) => {
   const { customerId } = req.user;
    const { id: paymentMethodId } = req.params;
        try {
            if (!customerId || !paymentMethodId) {
                return ErrorHandler("Payment method id & Stripe customer id not found!", 400, res);
            }

         const customer = await stripeInstance.customers.retrieve(customerId);
    if (customer.invoice_settings?.default_payment_method === paymentMethodId) {
      const { data: paymentMethods } = await stripeInstance.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      const newDefault = paymentMethods.find(pm => pm.id !== paymentMethodId);
      if (!newDefault) {
        return ErrorHandler("Cannot remove the only payment method", 400, res);
      }

      await stripeInstance.customers.update(customerId, {
        invoice_settings: { default_payment_method: newDefault.id },
      });
    }

    // Detach payment method
    await stripeInstance.paymentMethods.detach(paymentMethodId);
    return SuccessHandler(null, 200, res, "Payment method removeed successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
    },

    setCardAsDefault: async (req, res) => {
        const customerId = req.user.customerId;
        const paymentMethodId = req.params.id;

        console.log('paymentMethodId ===>', paymentMethodId);
        try {
            if (!customerId || !paymentMethodId) {
                return ErrorHandler("Payment method id & Stripe customer id not found!", 400, res);
            }

            await stripeInstance.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId }
            });
            const updatedPaymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);


            return SuccessHandler(null, 200, res, `****${updatedPaymentMethod.card.last4} is set as default Payment method!`);
        } catch (error) {
            console.log('Error ==> ', error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },



    // Invoices
  getAllInvoices:async (req, res) => {
  try {
    const { customerId } = req.user;
    const { paid, length } = req.query;

    // Input validation
    if (!customerId) {
      return ErrorHandler("Customer ID is missing!", 400, res);
    }
     const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        q: 'Wilmurt School Cold Brook',
        key: '66af4b8c50fa4a65a78478cadc3a2458',
        limit: 5,      // Number of results
        no_annotations: 1 // Optional: remove extra data
      }
    });

    const results = response.data.results;
    results.forEach((place, index) => {
    //   console.log(`${index + 1}: ${place.formatted}`);
    //   console.log(`Latitude: ${place.geometry.lat}, Longitude: ${place.geometry.lng}`);
      console.log('---',place);
    });

   

    console.log(results);
    const limit = length ? parseInt(length, 10) : undefined;
    const isPaid = paid === 'true' ? true : paid === 'false' ? false : undefined;

    // Service call
    const invoices = await invoiceService.getInvoices(customerId, { 
      paid: isPaid, 
      limit 
    });
const positionStackApiKey = "85ce00e91105fc69197aa92fed7802a8"; // Replace if invalid
    const searchQuery = "Medspass New York";
    const positionStackUrl = `http://api.positionstack.com/v1/forward?access_key=${positionStackApiKey}&query=${encodeURIComponent(searchQuery)}&limit=10`; // Added limit=10 for more results

    // const positionStackResponse = await fetch(positionStackUrl);
    // if (!positionStackResponse.ok) {
    //   throw new Error(`PositionStack HTTP error! Status: ${positionStackResponse.status}, Message: ${positionStackResponse.statusText}`);
    // }
    // const positionStackData = await positionStackResponse.json();
let finalResults = [];
    console.log(`Total Results from PositionStack: ${positionStackData.data ? positionStackData.data.length : 0}`);

    if (positionStackData.data && positionStackData.data.length > 0) {
      for (const result of positionStackData.data) {
        // console.log("📍 PositionStack Result:", {
        //   place: result.label,
        //   latitude: result.latitude,
        //   longitude: result.longitude,
        // });

//  const ZENSERP_KEY = "b2cfc4a0-896c-11f0-a3b9-31e37acc4469"; // Replace with your Zenserp API key
// const query = "Wilmurt School Cold Brook LinkedIn";
// const url = `https://app.zenserp.com/api/v2/search?apikey=${ZENSERP_KEY}&q=${encodeURIComponent(query)}&num=5&gl=us&hl=en`;
//  const res = await axios.get(url);
//     const results = res.data.organic || [];
    
//     console.log("Zenserp Organic Results:");
  
// for (const r of results) {
//   finalResults.push(r);
// }



}




  }

    return SuccessHandler(
      invoices, 
      200, 
      res, 
      `${invoices.length} Invoices retrieved!`
    );

  } catch (error) {
    
    // console.error('Invoice fetch error:', error);
    
    return ErrorHandler(
      error.message || "Internal server error", 
      error.statusCode || 500, 
      res
    );
  }
},

searchAndFindEmails :async(req,res) =>{
    const {query} = req.query;
  const places = await searchPlaces(query)

  for (const place of places) {
    console.log(`\nPlace: ${place.name}`);
    console.log(`Address: ${place.address}`);
    console.log(`Website: ${place.website || 'N/A'}`);

    if (place.website) {
      const domain = new URL(place.website).hostname.replace('www.', '');
      const emails = await getEmailsFromDomain(domain);
      console.log('Emails found:', emails.length > 0 ? emails : 'No emails found');
    } else {
      console.log('No website → skipping email search');
    }
  }
}
,
  getInvoice: async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ErrorHandler("Invoice ID is required", 400, res);
    }

    const expansions = [
      "customer",
      "payment_intent",
      "subscription",
      "subscription.plan",
      "lines.data.price.product",
      "customer.invoice_settings.default_payment_method",
      "payment_intent.payment_method",
    ];

    const invoice = await stripeInstance.invoices.retrieve(id, {
      expand: expansions,
    });

    if (!invoice) {
      return ErrorHandler("Invoice not found", 404, res);
    }

    return SuccessHandler(invoice, 200, res, "Invoice retrieved successfully");

  } catch (error) {
    console.error("Error retrieving invoice:", error.message);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error";
    return ErrorHandler(message, statusCode, res);
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

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Return a response to acknowledge receipt of the event
        res.json({ received: true });
    },





};


const invoiceService = {
  async getInvoices(customerId, options = {}) {
    const { paid, limit } = options;
    
    const stripeParams = {
      customer: customerId,
      ...(paid !== undefined && { status: paid ? 'paid' : undefined }),
      limit:10 ,
    };

    const res = await axios.get("https://api.opencagedata.com/geocode/v1/json", {
      params: {
        q: 'medspas new york',       // search text
        key: '66af4b8c50fa4a65a78478cadc3a2458',   // your key
        limit: 5,       // number of results
      },
    });
// f7963cc69344022861eaaeeb9b0976625aaa07f2
 const places = res.data.results.map(r => ({
    name: r.formatted,
    lat: r.geometry.lat,
    lng: r.geometry.lng,
    address: r.formatted,
  }))
  
 const response = await axios.post(
    "https://google.serper.dev/search",
    { q: `${places.name} site:linkedin.com` },
    { headers: { "X-API-KEY": 'f7963cc69344022861eaaeeb9b0976625aaa07f2', "Content-Type": "application/json" } }
  );
  console.log('response ===>',response.data.organic.map(r => r.link))
    if (places.website) {
      const { emails, socials } = await scrapeWebsite(places.website);
      console.log("Emails:", emails);
      console.log("Socials:", socials);
    }


// Geoapify API se address search karna
// const apiKey = "6eaa504a86762db549e6445ce505ae006d9005e3"; // Signup karke API key len: https://www.geoapify.com/
// const searchQuery = "Delhi Cafe";
// const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchQuery)}&apiKey=${apiKey}`;

// fetch(url)
//   .then(response => response.json())
//   .then(data => {
//     console.log('data 1 ===>',data)
//     // if (data.features.length > 0) {
//     //   console.log("Search Results:");
//     //   data.features.forEach(feature => {
//     //     console.log(`Place: ${feature.properties.formatted}, Lat: ${feature.geometry.coordinates[1]}, Lon: ${feature.geometry.coordinates[0]}`);
//     //   });
//     // } else {
//     //   console.log("No results found");
//     // }
//   })
//   .catch(error => console.error("Error:", error));

// 474da1cb168b1ce5f523a55479ea7be4

// PositionStack API se address search karna
// const apiKey = "474da1cb168b1ce5f523a55479ea7be4"; // Signup karke API key len: https://positionstack.com/
// const searchQuery = "Medspass New york";
// const url = `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${encodeURIComponent(searchQuery)}`;

// fetch(url)
//   .then(response => {
//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}, Message: ${response.statusText}`);
//     }
//     return response.json();
//   })
//   .then(data => {
//     if (data.data && data.data.length > 0) {
//       console.log("Search Results:");
//       data.data.forEach(result => {
//         console.log('result ===>',result)
//         // console.log(`Place: ${result.label}, Lat: ${result.latitude}, Lon: ${result.longitude}`);
//       });
//     } else {
//       console.log("No results found");
//     }
//   })
//   .catch(error => {
//     console.error("Error:", error);
//     if (error.message.includes("401") || error.message.includes("403")) {
//       console.log("Invalid API key. Please check your PositionStack API key.");
//     } else if (error.message.includes("429")) {
//       console.log("Rate limit exceeded. Try again later.");
//     } else {
//       console.log("Check your internet connection or query format.");
//     }
//   });

//   async function getNearbyBusinesses(lat, lng) {
//   const res = await axios.get("https://api.foursquare.com/v3/places/search", {
//     headers: { Authorization: 'KvKGUWeOwYtNDyslcbuVQbZ6maBYXRoPSaVgJLF8A' },
//     params: {
//       ll: `${lat},${lng}`,  // latitude,longitude
//       limit: 5
//     },
//   });

//   return res.data.results.map(b => ({
//     name: b.name,
//     website: b.website || null,
//     facebook: b.social_media?.facebook_id || null,
//     twitter: b.social_media?.twitter || null,
//   }));
// }
// fsq3T/KvKGUWeOwYtNDyslcbuVQbZ6maBYXRoPSaVgJLF8A=
///////////////////////


    const { has_more,data } = await stripeInstance.invoices.list(stripeParams);
    // next page of invoices
if (has_more) {
  const lastInvoiceId = data[data.length - 1].id;

  const nextInvoices = await stripeInstance.invoices.list({
    limit: 10,
    starting_after: lastInvoiceId,
    expand: ["data.lines"],
  });

  console.log("Next invoices:", nextInvoices.data.map(i => i.id));
}
    return data.map(this.transformInvoice);
  },

  transformInvoice(invoice) {
    const { paid_at } = invoice.status_transitions || {};
    const priceId = invoice.lines.data?.[0]?.price?.id;

    return {
      invoice_id: invoice.id,
      customer_id: invoice.customer,
      subscription_id: invoice.subscription,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      amount_remaining: invoice.amount_remaining,
      invoice_status: toTitleCase(invoice.status),
      price_id: priceId || "N/A",
      plan_details: priceId ? planDetails(priceId) : null,
      paid_status: invoice.paid,
      issue_date: convertTimestamp(invoice.created),
      due_date: invoice.due_date ? convertTimestamp(invoice.due_date) : "N/A",
      paid_at: paid_at ? convertTimestamp(paid_at) : "N/A",
      amount: (invoice.amount_due / 100).toFixed(2),
    };
  }
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



// Foursquare function
async function getNearbyBusinesses(lat, lng) {
  const res = await axios.get("https://api.foursquare.com/v3/places/search", {
    headers: { Authorization: "KvKGUWeOwYtNDyslcbuVQbZ6maBYXRoPSaVgJLF8A" }, // Foursquare API Key
    params: {
      ll: `${lat},${lng}`, // latitude,longitude
      limit: 5,
    },
  });
console.log('res ====>',res)
  return res.data.results.map((b) => ({
    name: b.name,
    website: b.website || null,
    facebook: b.social_media?.facebook_id || null,
    twitter: b.social_media?.twitter || null,
  }));
}

// PositionStack call



async function scrapeWebsite(url) {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(res.data);

    // Extract emails
    const emails = res.data.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    ) || [];
    console.log('emails')

    // Extract social links
    const socials = [];
    $("a").each((i, el) => {
      const link = $(el).attr("href");
      if (link && /(linkedin|facebook|twitter|instagram)\.com/.test(link)) {
        socials.push(link);
      }
    });

    return { emails, socials };
  } catch (err) {
    return { emails: [], socials: [] };
  }
}


async function searchPlaces(query, limit = 5) {
  try {
    const res = await axios.get('https://api.geoapify.com/v2/places', {
      params: {
        text: query,
        limit,
        apiKey: GEOAPIFY_API_KEY
      }
    });
    return res.data.features.map(place => ({
      name: place.properties.name,
      address: place.properties.formatted,
      website: place.properties.website
    }));
  } catch (err) {
    console.error('Geoapify error:', err.response?.data || err.message);
    return [];
  }
}