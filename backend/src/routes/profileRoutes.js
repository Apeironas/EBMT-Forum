const express = require('express');
const multer = require('multer');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { updateProfileSchema } = require('../validation/schemas');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.AVATAR_MAX_BYTES) || 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Yalnızca görüntü dosyası yüklenebilir (image/*).'));
      return;
    }
    cb(null, true);
  }
});

router.get('/by/:username', profileController.getPublicProfileByUsername);
router.post('/avatar', verifyToken, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        error: err.message || 'Dosya yükleme hatası.',
        status
      });
    }
    next();
  });
}, profileController.uploadAvatar);
router.get('/', verifyToken, profileController.getProfile);
router.put('/', verifyToken, validateBody(updateProfileSchema), profileController.updateProfile);

module.exports = router;
