const mongoose = require('mongoose');

const dailyPromiseBroadcastLogSchema = new mongoose.Schema(
  {
    broadcastDate: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mobile: { type: String, required: true },
    language: { type: String, enum: ['english', 'telugu'], default: 'telugu' },
    promiseDate: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    providerResponse: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  { timestamps: true, collection: 'daily_promise_broadcast_logs' }
);

dailyPromiseBroadcastLogSchema.index({ broadcastDate: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('DailyPromiseBroadcastLog', dailyPromiseBroadcastLogSchema);
