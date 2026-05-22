const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Applica a TODAS las rutas

router.post('/save', projectController.save);
router.get('/all', projectController.getAll);
router.get('/load', projectController.loadLatest);
router.get('/:id', projectController.getById);
router.post('/audit', projectController.audit);

module.exports = router;
