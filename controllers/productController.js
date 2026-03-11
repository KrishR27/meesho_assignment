const Product = require('../models/Product');

const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, countInStock, image } = req.body;

    if (!name || !description || price == null || countInStock == null) {
      res.status(400);
      return next(new Error('Please provide name, description, price, and countInStock'));
    }

    if (price < 0 || countInStock < 0) {
      res.status(400);
      return next(new Error('Price and stock count must be non-negative'));
    }

    const product = await Product.create({ name, description, price, countInStock, image });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    const { name, description, price, countInStock, image } = req.body;
    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.price = price ?? product.price;
    product.countInStock = countInStock ?? product.countInStock;
    product.image = image ?? product.image;

    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } catch (error) {
    next(error);
  }
};

const deleteDuplicates = async (req, res, next) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    const seen = new Set();
    const toDelete = [];

    for (const product of products) {
      const key = product.name.toLowerCase().trim();
      if (seen.has(key)) {
        toDelete.push(product._id);
      } else {
        seen.add(key);
      }
    }

    if (!toDelete.length) {
      return res.json({ message: 'No duplicate products found' });
    }

    await Product.deleteMany({ _id: { $in: toDelete } });
    res.json({ message: `Removed ${toDelete.length} duplicate product(s)` });
  } catch (error) {
    next(error);
  }
};

module.exports = { addProduct, getProducts, getProductById, updateProduct, deleteProduct, deleteDuplicates };
