const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { verifyToken } = require('../middlewares/auth');
const { loadProfile, requirePostOwnerOrElevated } = require('../middlewares/authorize');
const { validateBody } = require('../middlewares/validate');
const { createPostSchema, updatePostSchema, acceptAnswerSchema } = require('../validation/schemas');

// Post listelemeyi herkes yapabilir (Sayfalama aktif)
router.get('/', postController.getAllPosts);

// Tekil post getir (herkese açık)
router.get('/:postId', postController.getPostById);

// Yeni post eklemeyi SADECE giriş yapmış (token'ı olan) kişiler yapabilir
router.post('/', verifyToken, validateBody(createPostSchema), postController.createPost); // GÜVENLİK DEVREDE!

// Post güncelle/sil (sadece sahibi)
router.put(
  '/:postId',
  verifyToken,
  loadProfile,
  requirePostOwnerOrElevated,
  validateBody(updatePostSchema),
  postController.updatePost
);
router.delete('/:postId', verifyToken, loadProfile, requirePostOwnerOrElevated, postController.deletePost);

// Kabul edilen cevap (yetki kontrolü accept_answer/unaccept_answer RPC'sinde)
router.post('/:postId/accept-answer', verifyToken, validateBody(acceptAnswerSchema), postController.acceptAnswer);
router.delete('/:postId/accept-answer', verifyToken, postController.unacceptAnswer);

module.exports = router;