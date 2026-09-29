const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/', categoryController.listCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

module.exports = router;
