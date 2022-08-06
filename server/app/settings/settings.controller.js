const Settings = require('./settings.model');
const utils = require('../../components/utils');

const SettingsController = {

  /**
   * Gets all settings
   */
  index: async (req, res, next) => {
    try {
      const settings = await Settings
        .find()
        .select('name value');

      // Return the settings as an object and not an array
      const settingsObject = {};
      settings.forEach((o) => {
        settingsObject[o.name] = o.value;
      });

      utils.respondWithResult(res)({ settings: settingsObject });
    } catch (err) {
      utils.handleError(next)(err);
    }
  },

};

module.exports = SettingsController;
