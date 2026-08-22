const mongoose = require('mongoose');

const RecentActivitySchema = new mongoose.Schema({
  type: { type: String, default: 'user' },
  message: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecentActivity', RecentActivitySchema);
