const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      return next(new Error('Please provide name, email, and password'));
    }

    if (password.length < 6) {
      res.status(400);
      return next(new Error('Password must be at least 6 characters'));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      return next(new Error('User already exists'));
    }

    const isAdmin = !!(adminSecret && adminSecret === process.env.ADMIN_SECRET);
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, isAdmin });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      return next(new Error('Please provide email and password'));
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

const promoteToAdmin = async (req, res, next) => {
  try {
    const { email, adminSecret } = req.body;

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      res.status(403);
      return next(new Error('Invalid admin secret'));
    }

    const user = await User.findOneAndUpdate(
      { email },
      { isAdmin: true },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    res.json({ message: `${user.email} promoted to admin`, user });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser, promoteToAdmin };
