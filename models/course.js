import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  media: {
    type: String,
    default: null
  }
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  coverImage: {
    type: String,
    default: null,
  },
  color: {
    type: String,
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseCategory',
    required: true,
  },
  material: {
    type: [materialSchema],
    validate: {
      validator: function (value) {
        return value.length > 0; // Require at least one material
      },
      message: 'At least one material is required for the course.',
    },
  },
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
export default Course;