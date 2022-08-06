const User = require('../app/user/user.model');
const path = require('path');
const admin = require('snapjs-adminserver');
const authServer = require('snapmobile-authserver');
const snapAws = require('snapjs-aws');
const gameRoutes = require('../app/game');
const userRoutes = require('../app/user');
const songRoutes = require('../app/song');
const cardRoutes = require('../app/card');
const locationRoutes = require('../app/location');
const settingsRoutes = require('../app/settings');

/**
 * Expose routes
 */
module.exports = (app) => {
  /*
   * Only insert require to module folder
   * Routes should be defined in module folder
   */
  app.use('/api/cards', cardRoutes);
  app.use('/api/songs', songRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/settings', settingsRoutes);

  /**
   * Attach AWS signature endpoint
   */
  app.use('/api/aws/', snapAws.router);

  /**
   * Attach Admin portal module
   */
  admin.setUser(User);
  app.use('/api/admin', admin.router);

  /**
   * Attach Auth module
   */
  authServer.setUser(User);
  app.use('/api/auth', authServer.router);

  /**
   * Validation errors
   */
  app.use((err, req, res, next) => {
    if (err.stack.includes('ValidationError')) {
      res.status(422).json({ errors: err.errors });
      return;
    }

    next(err);
  });

  /**
   * Error handling -- Development
   */
  if (process.env.NODE_ENV === 'development') {
    app.use((err, req, res, next) => {
      console.error(err.stack);
      next(err);
    });
  }

  /**
   * Error handling -- Test
   */
  if (process.env.NODE_ENV === 'test') {
    app.use((err, req, res, next) => {
      next(err);
    });
  }

  /**
   * Error handling -- Production
   */
  if (process.env.NODE_ENV === 'production') {
    app.use((err, req, res, next) => {
      // treat as 404
      if (err.message
        && (~err.message.indexOf('not found')
        || (~err.message.indexOf('Cast to ObjectId failed')))) {
        next();
        return;
      }

      // error page
      res.status(500).json({ errors: err.errors });
    });
  }

  /**
   * Handle all unknown routes by sending Angular index.html
   * This must be included to work with html5mode
   */
  let buildFolder;
  if (process.env.NODE_ENV === 'production') {
    buildFolder = 'dist';
  } else {
    buildFolder = 'client';
  }

  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', buildFolder, 'index.html'));
  });
};
