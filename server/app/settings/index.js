const router = require('express').Router();
const controller = require('./settings.controller');

router.get('/', controller.index);

module.exports = router;
