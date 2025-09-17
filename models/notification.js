import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: new Date(),
  },
  userType: {
    type: String,
    validate: {
      validator: function (value) {
        return ["admin", "teacher", "student"].includes(value);
      },
      message: "Invalid userType",
    },
    required: true
  }

});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;