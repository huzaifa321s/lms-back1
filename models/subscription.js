import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  },
  status: {
    type: String,
    default: 'active',
  },
  subscriptionId: {
    type: String,
    default: null
  },
  customerId: {
    type: String,
    default: null
  },
  priceId: {
    type: String,
    default: null
  },
  trailsEndAt: {
    type: Date,
    default: null
  },
  endsAt: {
    type: Date,
    default: null
  },
  billingCycleAnchor: {
    type: Number,
    default: null
  },
  currentPeriodStart: {
    type: Number,
    default: null
  },
  currentPeriodEnd: {
    type: Number,
    default: null
  }
}, {timestamps: true});


const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;