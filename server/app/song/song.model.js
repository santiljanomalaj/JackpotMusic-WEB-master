const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  artist: { type: String },
  title: { type: String },
  categories: { type: Array },
  filename: { type: String },
  full_filename: { type: String },
  year_released: { type: Number },
  body: { type: Buffer },
}, { timestamps: true });

/**
 * Pre-save hooks
 */

// TODO: this will be left for potential future use
// Add the other file urls for any images
// SongSchema.pre('save', function(next) {

// next();
// });

/**
 * Methods
 */
SongSchema.methods = {

  /**
   * REMOVE - Test function for testing
   */
  testFunction() {
    return 'This is the test function';
  },

};

// SongSchema.statics = {

//   populateForAdmin() {
//     return '_locations _createdBy _relationship';
//   },

// };

module.exports = mongoose.model('Song', SongSchema);
