const router = require('express').Router();
const controller = require('./card.controller');

router.post('/', controller.create);
router.post('/:cardId/selectedSong/:songId', controller.addSongTimestamp);

module.exports = router;
