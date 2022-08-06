const router = require('express').Router();
const controller = require('./song.controller');

router.get('/getSongsByCategory', controller.getSongsByCategory);
router.get('/categories', controller.getCategories);

module.exports = router;
