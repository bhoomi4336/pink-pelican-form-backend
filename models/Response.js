const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true },
  phone: { type: String },
  age: { type: String },
  kidsCount: { type: String },
  kidsAge: { type: String },
  workingStatus: { type: String },
  industry: { type: String },
  continuedJob: { type: String },
  timeOff: { type: String },
  biggestChallenge: { type: String },
  passionOrHome: { type: String },
  joinedCommunity: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Response', responseSchema);