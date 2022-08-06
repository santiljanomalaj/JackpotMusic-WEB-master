const router = require('express').Router();
const auth = require('snapmobile-authserver').authService;
const controller = require('./game.controller');

// Authenticated routes
router.get('/terminateGame/:gameId', auth.isAuthenticated(), controller.terminateGame);
router.get('/startGame', auth.isAuthenticated(), controller.startGame);
router.get('/startRound', auth.isAuthenticated(), controller.startRound);
router.post('/:gameId/addStartAndEndTimestamps/:songId', auth.isAuthenticated(), controller.addStartAndEndTimestamps);
router.post('/', auth.isAuthenticated(), controller.create);
router.put('/:id', auth.isAuthenticated(), controller.update);
router.delete('/:id', auth.isAuthenticated(), controller.destroy);

// Non-authenticated routes
router.get('/:id', controller.show);
router.get('/resetGame/:gameId', controller.resetGame);
router.get('/lobby/:gameId', controller.getFilenamesByRounds);
router.get('/:gameId/currentRound', auth.isAuthenticated(false), controller.currentRound);
router.post('/:gameId/saveJackpotWinnerEvent', controller.saveJackpotWinnerEvent);
router.post('/:gameId/saveJackpotWinnerData', controller.saveJackpotWinnerData);
router.post('/sendJacpotWinnerDataWithMail', controller.sendJacpotWinnerDataWithMail);

module.exports = router;
