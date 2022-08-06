const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: Object, required: true },
  _createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Indexes this schema in 2dsphere format (critical for running proximity searches)
LocationSchema.index({ 'location.geometry.location': '2dsphere' });

/**
 * Methods
 */
LocationSchema.methods = {

};

LocationSchema.statics = {

  populateForAdmin() {
    return '_createdBy';
  },
};

module.exports = mongoose.model('Location', LocationSchema);
