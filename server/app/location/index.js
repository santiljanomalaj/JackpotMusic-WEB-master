const router = require('express').Router();
const auth = require('snapmobile-authserver').authService;
const controller = require('./location.controller');

router.get('/', controller.index);
router.get('/:id', auth.isAuthenticated(false), controller.show); // Auth is optional
router.post('/', auth.isAuthenticated(), controller.create);
router.put('/:id', auth.isAuthenticated(), controller.update);
router.patch('/:id', auth.isAuthenticated(), controller.update);

module.exports = router;
