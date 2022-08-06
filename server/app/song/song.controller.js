const Song = require('./song.model');
const utils = require('../../components/utils');
const Promise = require('bluebird');

const WHITELIST_ATTRIBUTES = [
  '_id',
  'artist',
  'title',
  'categories',
  'filename',
  'full_filename',
  'year_released',
  'body',
];

const SongController = {

  getSongsByCategory: async (req, res, next) => {
    try {
      const category = req.query.category;

      const songs = await Song.find({ categories: category });

      const response = utils.sanitizeObject(songs, WHITELIST_ATTRIBUTES);
      utils.respondWithResult(res)(response);
    } catch (error) {
      utils.handleError(next)(error);
    }
  },

  getCategories: async (req, res, next) => {
    try {
      const songs = await Song.find({});
      const categories = [];

      await Promise.each(songs, async (song) => {
        song.categories.forEach((category) => {
          if (!categories.includes(category)) {
            categories.push(category);
          }
        });
      });

      const response = utils.sanitizeObject(categories, WHITELIST_ATTRIBUTES);
      utils.respondWithResult(res)(response);
    } catch (error) {
      utils.handleError(next)(error);
    }
  },

};

module.exports = SongController;
