const express = require('express');
const subscriptionController = require('../controllers/subscription-controller');

const router = express.Router();

// POST - create a subscriptionController
router.post('', subscriptionController.createSubscription);

module.exports = router;
