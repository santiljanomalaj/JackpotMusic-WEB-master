const mongoose = require('mongoose');
const shortid = require('shortid');

const CardSchema = new mongoose.Schema({
  _gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  roundOne: [
    {
      _song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
      clickedAt: { type: Date, default: null },
      selectionStatus: { type: String, default: 'default' },
    },
  ],
  roundTwo: [
    {
      _song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
      clickedAt: { type: Date },
      selectionStatus: { type: String, default: 'default' },
    },
  ],
  roundThree: [
    {
      _song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
      clickedAt: { type: Date },
      selectionStatus: { type: String, default: 'default' },
    },
  ],
}, {
  timestamps: true,
  usePushEach: true,
});

/**
 * Methods
 */
CardSchema.methods = {

};

CardSchema.statics = {

  /**
   * Generate a short code for the winning card
   * To make it easier for game runner to quickly view capitalize
   * and also remove special characters (shortid only uses - and _)
   */
  generateWinningCode(length = 5) {
    return shortid.generate()
      .toUpperCase()
      .replace('-', '')
      .replace('_', '')
      .slice(0, length);
  },

  populateForAdmin() {
    return '';
  },

};

module.exports = mongoose.model('Card', CardSchema);
