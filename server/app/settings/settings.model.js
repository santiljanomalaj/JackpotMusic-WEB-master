const mongoose = require('mongoose');
const Promise = require('bluebird');

const SettingsSchema = new mongoose.Schema({
  name: { type: String },
  value: { type: Number },
}, { timestamps: true });

SettingsSchema.statics = {

  /**
   * Reset the Jackpot
   */
  async resetJackpot() {
    try {
      console.log('Resetting Jackpot...');
      const [jackpotResetAmount, jackpotAmount] = await Promise.all([
        mongoose.model('Settings').findOne({ name: 'jackpot_reset_amount' }),
        mongoose.model('Settings').findOne({ name: 'jackpot_amount' }),
      ]);

      // Check for missing amounts
      if (!jackpotResetAmount || !jackpotAmount) {
        console.error('Error resetting jackpot: Missing required reset amount or jackpot amount');
        return;
      }

      // Update value and save
      jackpotAmount.value = jackpotResetAmount.value;
      await jackpotAmount.save();
      console.log('The Jackpot was reset to:', jackpotResetAmount.value);
    } catch (error) {
      console.error('Error resetting jackpot:', error);
    }
  },
};

module.exports = mongoose.model('Settings', SettingsSchema);
