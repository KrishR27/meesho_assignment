const express = require('express');
const router = express.Router();
const { placeOrder, getUserOrders, getOrderById } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, placeOrder)
  .get(protect, getUserOrders);

router.route('/:id').get(protect, getOrderById);

module.exports = router;
