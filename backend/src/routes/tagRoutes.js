const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');

router.get('/', tagController.getAllTags);
router.get('/:slug', tagController.getPostsByTag);

module.exports = router;