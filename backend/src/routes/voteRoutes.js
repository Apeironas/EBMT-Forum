const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { verifyToken } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { castVoteSchema } = require('../validation/schemas');

// TEST AMAÇLI GEÇİCİ MIDDLEWARE (Artık ID olarak UUID kullanıyoruz)
/*router.use((req, res, next) => {
    // Aşağıdaki uzun metin yerine, KENDİ veritabanından kopyaladığın UUID'yi yapıştır!
    req.user = { id: '550e8400-e29b-41d4-a716-446655440000' }; 
    next();
});*/

// POST /api/votes endpoint
router.post('/', verifyToken, validateBody(castVoteSchema), voteController.castVote);

module.exports = router;