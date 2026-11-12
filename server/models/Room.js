const mongoose = require('mongoose');

const rubricSchema = new mongoose.Schema(
  {
    problemSolving: { type: Number, min: 1, max: 5, default: 3 },
    codeQuality: { type: Number, min: 1, max: 5, default: 3 },
    communication: { type: Number, min: 1, max: 5, default: 3 },
    speed: { type: Number, min: 1, max: 5, default: 3 },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      default: 'Untitled Workspace',
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    language: {
      type: String,
      enum: ['python', 'javascript', 'typescript', 'cpp', 'java', 'go', 'rust'],
      default: 'javascript',
    },
    content: {
      type: String,
      default: '',
    },
    isInterviewMode: {
      type: Boolean,
      default: false,
    },
    interviewRubric: {
      type: rubricSchema,
      default: () => ({}),
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Room', roomSchema);
