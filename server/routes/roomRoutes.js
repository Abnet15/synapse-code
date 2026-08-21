const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, roomController.createRoom);
router.get('/', authMiddleware, roomController.getRooms);
router.get('/:roomId', authMiddleware, roomController.getRoom);
router.put('/:roomId', authMiddleware, roomController.saveRoom);

module.exports = router;
