const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { protect } = require('../middleware/auth');

router.get('/', lessonController.getLessons);
router.get('/:id', lessonController.getLessonById);
router.post('/', protect, lessonController.createLesson);

module.exports = router;
