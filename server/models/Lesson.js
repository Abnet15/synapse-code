const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    targetCode: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      enum: ['python', 'javascript', 'typescript', 'cpp', 'java', 'go', 'rust'],
      required: true,
    },
    initialCode: {
      type: String,
      default: '',
    },
    requiresPro: {
      type: Boolean,
      default: false,
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Lesson', lessonSchema);
