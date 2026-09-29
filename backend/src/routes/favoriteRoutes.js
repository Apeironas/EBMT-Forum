const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const favoriteController = require('../controllers/favoriteController');
const { validateBody } = require('../middlewares/validate');
const { addFavoriteSchema } = require('../validation/schemas');

router.get('/', verifyToken, favoriteController.listMyFavorites);
router.post('/', verifyToken, validateBody(addFavoriteSchema), favoriteController.addFavorite);
router.delete('/:postId', verifyToken, favoriteController.removeFavorite);

module.exports = router;
