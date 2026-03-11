const Order = require('../models/Order');

const placeOrder = async (req, res, next) => {
  try {
    const { orderItems, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      return next(new Error('No order items provided'));
    }

    if (totalPrice == null || totalPrice < 0) {
      res.status(400);
      return next(new Error('Please provide a valid total price'));
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      totalPrice,
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('orderItems.product');
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('orderItems.product');

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

module.exports = { placeOrder, getUserOrders, getOrderById };
