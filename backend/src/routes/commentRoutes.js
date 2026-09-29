const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { loadProfile, requireCommentOwnerOrElevated } = require('../middlewares/authorize');
const {
    createComment,
    getCommentsByPost,
    getCommentById,
    updateComment,
    deleteComment
} = require('../controllers/commentController');
const { validateBody } = require('../middlewares/validate');
const { createCommentSchema, updateCommentSchema } = require('../validation/schemas');

// =============================================================
// POST bazlı yorum rotaları (nested: /api/posts/:postId/comments)
// =============================================================

// Bir gönderinin tüm yorumlarını getir (herkese açık)
router.get('/posts/:postId/comments', getCommentsByPost);

// Bir gönderiye yorum yaz (giriş yapmış kullanıcı gerekli)
router.post('/posts/:postId/comments', verifyToken, validateBody(createCommentSchema), createComment);

// =============================================================
// Tekil yorum rotaları (/api/comments/:commentId)
// =============================================================

// Tek bir yorumu alt yorumlarıyla getir (herkese açık)
router.get('/comments/:commentId', getCommentById);

// Yorum güncelle (sadece yorum sahibi)
router.put(
  '/comments/:commentId',
  verifyToken,
  loadProfile,
  requireCommentOwnerOrElevated,
  validateBody(updateCommentSchema),
  updateComment
);

// Yorum sil (yorum sahibi veya admin/moderatör)
router.delete('/comments/:commentId', verifyToken, loadProfile, requireCommentOwnerOrElevated, deleteComment);

module.exports = router;
