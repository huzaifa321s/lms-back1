import stripe from "stripe";
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

const dailyPriceID = process.env.DAILY_PRICE_ID;
const bronzePriceID = process.env.BRONZE_PRICE_ID;
const silverPriceID = process.env.SILVER_PRICE_ID;
const goldPriceID = process.env.GOLD_PRICE_ID;

// config/plans.js
export const PLAN_MAP = {
    [dailyPriceID]: "Daily",
    [bronzePriceID]: "Bronze",
    [silverPriceID]: "Silver",
    [goldPriceID]: "Gold",
};

async function fetchAllSubscriptions() {
    let allSubscriptions = [];
    let hasMore = true;
    let lastId = null;

    while (hasMore) {
        const response = await stripeInstance.subscriptions.list({
            limit: 100,
            status: "active",
            starting_after: lastId || undefined,
        });

        allSubscriptions = [...allSubscriptions, ...response.data];
        hasMore = response.has_more;

        if (hasMore) {
            lastId = response.data[response.data.length - 1].id;
        }
    }

    return allSubscriptions;
}

// ✅ Main: calculate plan counts
export async function getPlansOverview() {
  const subscriptions = await fetchAllSubscriptions();

  const planCounts = {
    Daily: 0,
    Bronze: 0,
    Silver: 0,
    Gold:0
  };

  for (const sub of subscriptions) {
    const priceId = sub.items.data[0].price.id;
    const planName = PLAN_MAP[priceId];

    if (planName) {
      planCounts[planName] += 1;
    }
  }

  return [
    { name: "Daily", value: planCounts.Daily },
    { name: "Bronze", value: planCounts.Bronze },
    { name: "Silver", value: planCounts.Silver },
    { name: "Gold", value: planCounts.Gold },
  ];
}