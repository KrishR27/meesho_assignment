const express = require('express');
const router = express.Router();
const { registerUser, loginUser, promoteToAdmin } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/promote', promoteToAdmin);

module.exports = router;
