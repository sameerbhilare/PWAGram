const mongoose = require('mongoose');

// schema is blueprint of how the Post object will look like
const subscriptionSchema = mongoose.Schema({
  endpoint: { type: String, required: true },
  keys: {
    auth: { type: String, required: true },
    p256dh: { type: String, required: true },
  },
});

module.exports = mongoose.model('Subscription', subscriptionSchema); // collection name will be 'subscriptions'
