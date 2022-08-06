const router = require('express').Router();
const auth = require('snapmobile-authserver').authService;
const userController = require('./user.controller');

// Authenticated user routes
router.post('/signup', userController.create);
router.get('/me', auth.isAuthenticated(), userController.show);
router.put('/me', auth.isAuthenticated(), userController.update);
router.delete('/me', auth.isAuthenticated(), userController.destroy);
router.post('/me/stripePaymentSetup', auth.isAuthenticated(), userController.setupStripePayment);

// Reset password routes
router.put('/me/password', auth.isAuthenticated(), userController.changePassword);
router.put('/me/forgot', userController.forgotPassword);
router.get('/me/reset/:token', userController.resetToken);
router.put('/me/reset/:token', userController.resetPassword);

// Email confirmation routes
router.put('/me/email', userController.sendConfirmationEmailApi);
router.put('/me/confirmEmail/:token', userController.confirmEmail);

// Add OneSignal device id
router.post('/addDevice', auth.isAuthenticated(), userController.addDevice);

module.exports = router;
