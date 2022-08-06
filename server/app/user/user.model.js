const crypto = require('crypto');
const mongoose = require('mongoose');
const Promise = require('bluebird');
const validator = require('validator');
const moment = require('moment');
const Game = require('../game/game.model');

const PaymentSchema = new mongoose.Schema({
  paymentTotal: { type: String },
  transactionId: { type: String },
  _games: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
}, { timestamps: true });

const UserSchema = new mongoose.Schema(
  {
    displayName: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, lowercase: true, trim: true, required: true, index: true, unique: true },
    roles: Array,
    avatar: Object,
    password: { type: String, required: true },
    salt: String,
    provider: { type: String, default: 'local' },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isEmailConfirmed: { type: Boolean, default: false },
    emailConfirmationToken: String,
    emailConfirmationExpires: Date,
    deviceIds: Array,
    _location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    stripeCustomerId: { type: String },
    stripeLast4: { type: String },
    stripeExpMonth: { type: String },
    stripeExpYear: { type: String },
    paymentHistory: [PaymentSchema],
  }, {
    timestamps: true,
    usePushEach: true,
  },
);

/**
 * Validators
 */
UserSchema.path('email').validate((email) => {
  validator.isEmail(email);
}, 'The e-mail is not a valid format.');

UserSchema.path('email').validate(function(email, done) {
  mongoose.model('User').count({ email, _id: { $ne: this._id } }, (err, count) => {
    if (err) {
      done(err);
      return;
    }

    done(!count);
  });
}, 'Email already exists');

/**
 * Pre-save hooks
 */

// Arrays cannot have a 'default:' value in the schema definition
UserSchema.pre('save', function(next) {
  // Remove empty strings
  this.roles = this.roles.filter(n => !!n);

  // Set default role(s) here
  if (!this.roles.length) {
    this.roles = ['user'];
  }

  next();
});

// // On every save update the display name
// UserSchema.pre('save', function(next) {
//   this.displayName = `${this.firstName} ${this.lastName}`;
//   next();
// });

// Create encrypted password
UserSchema.pre('save', function(next) {
  if (!this || !this.isModified('password')) {
    next();
    return;
  }

  this.generateSalt((err, salt) => {
    if (err) { next(err); }

    this.salt = salt;

    this.encryptPassword(this.password, (error, encryptedPassword) => {
      if (error) { next(error); }

      this.password = encryptedPassword;
      next();
    });
  });
});

/**
 * Methods
 */
UserSchema.methods = {

  /**
   * Check if the unencrypted password matches the saved encyrpted password
   * @param  {String} Unencrypted password
   * @param  {Function} Callback(error, Boolean)
   */
  authenticate(password, callback) {
    this.encryptPassword(password, (err, encryptedPassword) => {
      if (encryptedPassword === this.password) {
        callback(null, true);
      } else {
        callback(new Error('Incorrect password'), false);
      }
    });
  },

  /**
   * Encrypt a password
   * @param  {String} Unencrypted password
   * @param  {Function} Callback(error, encryptedPassword)
   */
  encryptPassword(password, callback) {
    const salt = this.salt;
    const defaultIterations = 10000;
    const defaultKeyLength = 64;
    const saltBase64 = new Buffer(salt, 'base64');
    const digest = 'sha512';

    crypto.pbkdf2(password, saltBase64, defaultIterations, defaultKeyLength, digest, (err, key) => {
      if (err) { callback(err); }

      callback(null, key.toString('base64'));
    });
  },

  /**
   * Generate a salt string
   * @param  {Function} Callback(error, salt)
   */
  generateSalt(callback) {
    const byteSize = 16;
    crypto.randomBytes(byteSize, (err, salt) => {
      if (err) { callback(err); }

      callback(null, salt.toString('base64'));
    });
  },

  /**
   * Generate tokens to reset the password, confirmation email or others if necessary.
   * @returns {Promise} Promise Generated token
   */
  generateToken() {
    return new Promise((resolve, reject) => {
      const byteSize = 16;
      crypto.randomBytes(byteSize, (err, resetToken) => {
        if (err) { reject(err); }
        resolve(resetToken.toString('hex'));
      });
    });
  },

  /**
   * Creates and saves a new reset token for a user
   * @return {Promise} User.save() promise
   */
  async saveResetToken() {
    this.resetPasswordToken = await this.generateToken();
    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    return this.save();
  },

  /**
   * Generate and saves a new token for the email confirmation
   * @returns {Promise} Promise User.save()
   */
  async saveEmailToken() {
    this.emailConfirmationToken = await this.generateToken();
    this.emailConfirmationExpires = Date.now() + 3600000; // 1 hour
    return this.save();
  },

  /**
   * Convenience method to know if the customer stripe account is setup
   */
  isStripeCustomerSetup() {
    return !!this.stripeCustomerId;
  },

  /**
   * Gets all unpaid games for a user
   */
  async unpaidGames() {
    return Game.find({
      _location: this._location,
      isTest: { $ne: true },
      paymentAt: null,
      startTime: { $lte: moment().subtract(48, 'hours') },
    });
  },

  /**
   * Returns true if the user has 'admin' as a role
   */
  isAdmin() {
    return this.roles.includes('admin');
  },

};

module.exports = mongoose.model('User', UserSchema);
