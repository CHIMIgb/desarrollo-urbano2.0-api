const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Applica a TODAS las rutas

router.get('/', configController.getConfig);

module.exports = router;
