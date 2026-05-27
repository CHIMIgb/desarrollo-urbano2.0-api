const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/validate', authController.validate);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

module.exports = router;
