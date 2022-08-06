const _ = require('lodash');
const User = require('./user.model');
const authServer = require('snapmobile-authserver');
const utils = require('../../components/utils');
const Mailer = require('../../components/mailer');
const stripe = require('stripe')(process.env.STRIPE_CLIENT_SECRET);

const Auth = authServer.authService;

const WHITELIST_ATTRIBUTES = [
  '_id',
  'firstName',
  'lastName',
  'email',
  '_location',
  'stripeLast4',
  'stripeExpMonth',
  'stripeExpYear',
  'token',
];

const WHITELIST_REQUEST_ATTRIBUTES = [
  'firstName',
  'lastName',
  'displayName',
  'email',
  'password',
];

const UserController = {};

/**
 * Creates a new user
 */
UserController.create = async (req, res) => {
  try {
    const count = await new Promise((resolve, reject) => {
      User.count({ email: req.body.email }, (err, c) => {
        if (err) {
          reject(err);
        }
        resolve(c);
      });
    });

    if (count > 0) {
      throw new Error('This email is already registered');
    }
  
    
    const newUser = utils.sanitizeObject(req.body, WHITELIST_REQUEST_ATTRIBUTES);
    let user = await User.create(newUser);
    
    // Send email confirmation when the user is created
    await UserController.sendConfirmationEmail(req.body);
    
    // Add auth token to response
    user = user.toObject();
    user.token = Auth.signToken(user._id);

    const response = utils.sanitizeObject(user, WHITELIST_ATTRIBUTES);
    utils.respondWithResult(res)(response);
  } catch ({ message }) {
    res.status(400).json({ message });
  }
};

/**
 * Returns the authenticated user
 */
UserController.show = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('_location');

    if (user) {
      const response = utils.sanitizeObject(user, WHITELIST_ATTRIBUTES);

      // Add and return roles if this user is an admin
      if (req.user.isAdmin()) {
        response.roles = req.user.roles;
      }

      utils.respondWithResult(res)(response);
    } else {
      utils.handleEntityNotFound(res);
    }
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Updates the authenticated user
 */
UserController.update = async (req, res, next) => {
  try {
    const updatedUser = utils.sanitizeObject(req.body, WHITELIST_REQUEST_ATTRIBUTES);
    const user = await User.findById(req.user._id);

    if (user) {
      _.assign(user, updatedUser);
      await user.save();

      const response = utils.sanitizeObject(user, WHITELIST_ATTRIBUTES);
      utils.respondWithResult(res)(response);
    } else {
      utils.handleEntityNotFound(res);
    }
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Delete the authenticated user
 */
UserController.destroy = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      await user.remove();
      res.status(204).end();
    } else {
      utils.handleEntityNotFound(res);
    }
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Change the current user's password
 */
UserController.changePassword = async (req, res, next) => {
  try {
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;

    if (!newPassword) {
      utils.respondWithError(res)('New password is required');
      return;
    }

    if (!oldPassword) {
      utils.respondWithError(res)('Old password is required');
      return;
    }

    const user = await User.findById(req.user._id);

    if (user) {
      user.authenticate(oldPassword, async (err, authenticated) => {
        if (authenticated) {
          user.password = newPassword;
          await user.save();

          utils.respondWithSuccess(res)('Password successfully changed');
        } else {
          utils.respondWithError(res)('Incorrect password');
        }
      });
    } else {
      utils.handleEntityNotFound(res);
    }
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Creates and sends a password reset token and URL to a user
 * @param {Object<email>} req Request object that includes email
 * @param {Object} res Response object
 * @param {Function} next Next callback
 */
UserController.forgotPassword = async (req, res, next) => {
  try {
    const email = req.body.email;

    if (!email) {
      utils.respondWithError(res)('Email is required');
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      utils.respondWithError(res)('Could not find a user with this email');
      return;
    }

    await user.saveResetToken();

    const mailOptions = {
      to: user.email,
      from: process.env.FROM_EMAIL,
      subject: 'Password Reset',
      html: ('../app/user/views/forgotPassword.html'),
    };

    const baseUrl = process.env.BASE_URL;
    const data = { baseUrl, user };
    const mailer = new Mailer(mailOptions);

    await mailer.sendMail(data);

    utils.respondWithSuccess(res)('Password reset instructions have been sent.');
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Confirms if the password reset token is valid or not
 * @param {Object<token>} req Request object including reset token
 * @param {Object} res  Response object
 * @param {Function} next Next callback
 */
UserController.resetToken = async (req, res, next) => {
  try {
    const token = req.params.token;

    const user = await User.findOne({
      resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      utils.respondWithError(res)('Password reset token is incorrect or has expired.');
      return;
    }

    utils.respondWithSuccess(res)('Password reset token is valid.');
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Resets a password for a user
 * @param {Object<token,password>} req Request object including token and password
 * @param {Object} res  Response object
 * @param {Function} next Next callback
 */
UserController.resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token;
    const password = req.body.password;

    if (!password) {
      utils.respondWithError(res)('Password is required.');
      return;
    }

    const user = await User.findOne({
      resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      utils.respondWithError(res)('Password reset token is incorrect or has expired.');
      return;
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    const mailOptions = {
      to: user.email,
      from: process.env.FROM_EMAIL,
      subject: 'Password Reset',
      text: 'Hello,\n\nThis is a confirmation your password has been reset.\n',
    };
    const mailer = new Mailer(mailOptions);
    await mailer.sendMail();

    utils.respondWithSuccess(res)('Password has been updated.');
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Creates and sends a email confirmation token and URL to a user
 * @param {Object<user>} User user
 */
UserController.sendConfirmationEmail = async (user) => {
  await user.saveEmailToken();

  const mailOptions = {
    to: user.email,
    from: process.env.FROM_EMAIL,
    subject: 'Jackpot Music - Email confirmation',
    html: ('../app/user/views/emailConfirmation.html'),
  };

  const baseUrl = process.env.BASE_URL;
  const data = { baseUrl, user };
  const mailer = new Mailer(mailOptions);

  await mailer.sendMail(data);
};

/**
 * Creates and sends a email confirmation token and URL to a user
 * It is used for the API
 * @param {Object<email>} req Request object that includes email
 * @param {Object} res Response object
 * @param {Function} next Next callback
 */
UserController.sendConfirmationEmailApi = async ({ body: { email } }, res, next) => {
  try {
    if (!email) {
      utils.respondWithError(res)('Email is required');
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      utils.respondWithError(res)('Could not find a user with this email');
      return;
    }

    if (user.isEmailConfirmed === true) {
      utils.respondWithError(res)('This email is already confirmed');
      return;
    }

    await UserController.sendConfirmationEmail(user);
    utils.respondWithSuccess(res)('The confirmation email has been sent');
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Confirms an email for an user
 * @param {Object<token>} req Request object including reset token
 * @param {Object} res  Response object
 * @param {Function} next Next callback
 */
UserController.confirmEmail = async ({ params: { token } }, res, next) => {
  try {
    const user = await User.findOne({
      emailConfirmationToken: token,
      emailConfirmationExpires: { $gt: Date.now() },
    });

    if (!user) {
      utils.respondWithError(res)('Confirmation email token is incorrect or has expired.');
      return;
    }

    user.isEmailConfirmed = true;
    user.emailConfirmationToken = null;
    user.emailConfirmationExpires = null;
    await user.save();

    utils.respondWithSuccess(res)('Password has been updated.');
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Add a device id to the authenticated user
 * If the device id is already in the user's device ids, respond with success but ignore id
 */
UserController.addDevice = async (req, res, next) => {
  try {
    if (!req.body.deviceId && !req.body.deviceId.userId) {
      utils.respondWithError(res)('Device id is required');
      return;
    }

    const deviceId = req.body.deviceId.userId || req.body.deviceId;

    const user = await User.findById(req.user._id);

    if (user.deviceIds.indexOf(deviceId) === -1) {
      user.deviceIds.push(deviceId);
      await user.save();

      utils.respondWithSuccess(res)('Device id has been added');
    } else {
      utils.respondWithSuccess(res)('Device id has already been added');
    }
  } catch (err) {
    utils.handleError(next)(err);
  }
};

/**
 * Sets up Stripe payment for a user
 */
UserController.setupStripePayment = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      if (user.stripeCustomerId) {
        const customer = await stripe.customers.update(req.user.stripeCustomerId, {
          email: req.user.email,
          source: req.body.id,
        });

        if (customer && customer.sources.data[0]) {
          // Store credit card information for reference
          user.stripeLast4 = customer.sources.data[0].last4;
          user.stripeExpMonth = customer.sources.data[0].exp_month;
          user.stripeExpYear = customer.sources.data[0].exp_year;

          const updatedUser = await user.save();
          if (updatedUser) {
            res.status(200).end();
          } else {
            res.status(422).json({ message: 'Could not save account.' });
          }
        } else {
          res.status(422).json({ message: 'Something went wrong.' });
        }
      } else {
        const customer = await stripe.customers.create({
          email: req.user.email,
          source: req.body.id,
        });

        if (customer && customer.sources.data[0]) {
          user.stripeCustomerId = customer.id;

          // Store credit card information for reference
          user.stripeLast4 = customer.sources.data[0].last4;
          user.stripeExpMonth = customer.sources.data[0].exp_month;
          user.stripeExpYear = customer.sources.data[0].exp_year;

          const updatedUser = await user.save();
          if (updatedUser) {
            res.status(200).end();
          } else {
            res.status(422).json({ message: 'Could not save account.' });
          }
        } else {
          res.status(422).json({ message: 'Something went wrong.' });
        }
      }
    }
  } catch (err) {
    utils.respondWithError(res)(err.message);
  }
};

module.exports = UserController;
