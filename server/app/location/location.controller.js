const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const Mailer = require('../../components/mailer');
const utils = require('../../components/utils');
const Location = require('./location.model');
const Game = require('../game/game.model');

/**
 * The distance users should be notified when a game is created
 * as well as view in the game list
 * @type {Number}
 */
// TODO: Client asked to remove distance, instead set a super high max
// const MAX_DISTANCE = 40233.6; // 25 miles
const MAX_DISTANCE = 999999999; // soooo many miles

const WHITELIST_ATTRIBUTES = [
  '_id',
  'name',
  'location',
  'games',
  'createdAt',
  'updatedAt',
];

const WHITELIST_REQUEST_ATTRIBUTES = [
  'name',
  'location',
];

const LocationController = {

  /**
   * Gets a list of locations
   */
  index: async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 20;
      const skip = Number(req.query.skip) || 0;
      const select = WHITELIST_ATTRIBUTES.join(' ');
      const query = {};

      // Get locations near user based on what is sent in req.query
      // If the lat and long are null, use the default lat and long
      const lat = Number(req.query.lat) || Number(process.env.DEFAULT_LAT);
      const long = Number(req.query.long) || Number(process.env.DEFAULT_LONG);
      const point = { type: 'Point', coordinates: [long, lat] };
      const maxDistance = MAX_DISTANCE;

      query.$and = [];
      query.$and.push({ 'location.geometry.location': { $near: { $geometry: point, $maxDistance: maxDistance } } });

      // Get all locations near the user
      const locations = await Location
        .find(query)
        .select(select)
        .lean();

      // Get games for each location that are not terminated or finished
      // Games should still be returned in the list 55 minutes after the start time has passed
      await Promise.map(locations, async (location) => {
        const games = await Game
          .find({
            _location: location._id,
            startTime: { $gte: moment().subtract(55, 'minutes') },
            terminatedAt: null,
            finishedAt: null,
          })
          .sort('startTime');
        location.games = games;
      });

      // Remove any locations that don't have games from the array
      const locationsWithGames = locations.filter(location => location.games.length);

      // Get new count based on locations with games
      const finalLocationsCount = locationsWithGames.length;

      // Paginate the array of total locations (not the mongoose query)
      const finalLocations = locationsWithGames.slice(skip, skip + limit);

      utils.respondWithResult(res)({ locations: finalLocations, locationsCount: finalLocationsCount });
    } catch (err) {
      utils.handleError(next)(err);
    }
  },

  /**
   * Gets a single location
   */
  show: async (req, res, next) => {
    try {
      const location = await Location.findOne({ _id: req.params.id }).lean();

      if (location) {
        // See if this is the owner of the location
        // Req.user is optional for this endpoint
        let isOwner = false;
        if (req.user) {
          isOwner = (String(req.user._location) === String(location._id));
        }

        // Get games for the location
        // that are not terminated or finished
        // If this is the owner of the location, send all games for the location
        const query = {
          _location: location._id,
        };

        if (!isOwner) {
          query.terminatedAt = null;
          query.finishedAt = null;
          query.startTime = { $gte: moment().subtract(15, 'minutes') };
        }

        const games = await Game
          .find(query)
          .sort('startTime');
        location.games = games;

        const response = utils.sanitizeObject(location, WHITELIST_ATTRIBUTES);
        utils.respondWithResult(res)(response);
      } else {
        utils.handleEntityNotFound(res);
      }
    } catch (err) {
      utils.handleError(next)(err);
    }
  },

  /**
   * Create a new location
   * Currently the authenticated user can only create one location
   * Set that location to the req.user._location after it's created
   */
  create: async (req, res, next) => {
    try {
      const newItem = utils.sanitizeObject(req.body, WHITELIST_REQUEST_ATTRIBUTES);

      // A user can only have one location for now
      // Make sure this user can't create a location if they already have a location
      if (req.user._location) {
        return utils.respondWithError(res)('You already have a location');
      }

      // Set the current user as the creator
      newItem._createdBy = req.user._id;
      const location = await Location.create(newItem);

      // Add this location as the req.user._location
      req.user._location = location;
      await req.user.save();
      // mail sending for the sign up
      const mailData = {
        location: req.user._doc._location._doc.location.formatted_address,
        displayName: req.user._doc.displayName,
        email: req.user._doc.email,
      }
      await LocationController.sendConfirmationEmail(mailData);
      
      const response = utils.sanitizeObject(location, WHITELIST_ATTRIBUTES);
      return utils.respondWithResult(res)(response);
    } catch (err) {
      return utils.handleError(next)(err);
    }
  },
  
  // the mail notificaiton for the sign up

  sendConfirmationEmail : async (user) => {
    console.log("create the user")
    const mailOptions = [{
        to: process.env.ADMIN_EMAIL1,
        from: process.env.FROM_EMAIL,
        subject: 'Jackpot User Creation - Email confirmation',
        html: ('../app/user/views/accountNotification.html'),
      },
      {
        to: process.env.ADMIN_EMAIL2,
        from: process.env.FROM_EMAIL,
        subject: 'Jackpot User Creation - Email confirmation',
        html: ('../app/user/views/accountNotification.html'),
      }
    ];
  
    const data = {
      location: user.location,
      name: user.displayName,
      email: user.email,
    };
    
    mailOptions.forEach((mailOption) => {
      const mailer = new Mailer(mailOption);
      mailer.sendMail(data);
    })
  },
  /**
   * Update an existing item
   * Make sure the authenticated user has access to update this location
   */
  update: async (req, res, next) => {
    try {
      const updatedItem = utils.sanitizeObject(req.body, WHITELIST_REQUEST_ATTRIBUTES);

      const location = await Location.findOne({ _id: req.params.id });

      // If authenticated user doesn't have access, respond with an error
      if (String(location._id) !== String(req.user._location)) {
        return utils.respondWithError(res)('You do not have permission to update this location', 403);
      }

      // Return error if there is no location
      if (!location) {
        return utils.handleEntityNotFound(res);
      }

      _.assign(location, updatedItem);
      await location.save();

      const response = utils.sanitizeObject(location, WHITELIST_ATTRIBUTES);
      return utils.respondWithResult(res)(response);
    } catch (err) {
      return utils.handleError(next)(err);
    }
  },

};

module.exports = LocationController;
