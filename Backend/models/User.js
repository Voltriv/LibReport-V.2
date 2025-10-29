const mongoose = require('mongoose');
const validator = require('validator');
const { STUDENT_ID_REGEX } = require('./validators');

const userSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: v => STUDENT_ID_REGEX.test(v),
        message: 'Student ID must match 00-0000-000000 pattern'
      }
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: v => validator.isEmail(v),
        message: 'Email must be a valid address'
      }
    },
    name: { type: String, trim: true },
    fullName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: v => /^[A-Za-z .'-]+$/.test(v),
        message: "Full name may contain letters, spaces, apostrophes, hyphens, and periods only"
      }
    },
    department: { type: String, trim: true },
    barcode: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['Student', 'faculty', 'staff', 'admin', 'librarian', 'librarian_staff'],
      default: 'student',
      trim: true
    },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

