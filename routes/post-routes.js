const express = require('express');
const postController = require('../controllers/post-controller');
const extractFile = require('../middleware/file-upload');

const router = express.Router();

// POST - create a post
router.post('', extractFile, postController.createPost);

// GET a post
router.get('/:id', postController.getPost);

// GET - get all psots
router.get('', postController.getPosts);

module.exports = router;
