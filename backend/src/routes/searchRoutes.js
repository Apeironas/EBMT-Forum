const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

router.get('/posts', searchController.searchPosts);

module.exports = router;
