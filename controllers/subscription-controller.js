const mongoose = require('mongoose');
const Subscription = require('../models/subscription');

exports.createSubscription = (req, res, next) => {
  const subscription = new Subscription({
    endpoint: req.body.endpoint,
    keys: {
      auth: req.body.keys.auth,
      p256dh: req.body.keys.p256dh,
    },
  });
  // save to DB
  subscription
    .save()
    .then((createdSub) => {
      res.status(201).json({
        message: 'Subscription added successfully!',
      });
    })
    .catch((error) => {
      console.log('createSubscription', error);
      res.status(500).json({
        message: 'Creating a Subscription failed!',
      });
    });
};
