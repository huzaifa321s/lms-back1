import mongoose from 'mongoose';

const teacherWalletSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },

});

const TeacherWallet = mongoose.model('TeacherWallet', teacherWalletSchema);
export default TeacherWallet;