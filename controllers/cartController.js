const Cart = require('../models/Cart');

const addToCart = async (req, res, next) => {
  try {
    const { productId, qty } = req.body;

    if (!productId || !qty) {
      res.status(400);
      return next(new Error('Please provide productId and qty'));
    }

    if (qty < 1) {
      res.status(400);
      return next(new Error('Quantity must be at least 1'));
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex((i) => i.product.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].qty += qty;
    } else {
      cart.items.push({ product: productId, qty });
    }

    const updated = await cart.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) {
      return res.json({ user: req.user._id, items: [] });
    }
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      res.status(404);
      return next(new Error('Cart not found'));
    }

    const itemExists = cart.items.some((i) => i._id.toString() === req.params.itemId);
    if (!itemExists) {
      res.status(404);
      return next(new Error('Item not found in cart'));
    }

    cart.items = cart.items.filter((i) => i._id.toString() !== req.params.itemId);
    const updated = await cart.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = { addToCart, getCart, removeFromCart, clearCart };
