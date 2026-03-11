const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        qty: { type: Number, required: true, default: 1 },
      },
    ],
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: true },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
