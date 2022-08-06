const _ = require('lodash');

const Utils = {

  /**
   * Handle entity not found for a request / response
   * @param  {Object} res The response object for the request
   * @return {Function<Object>}     The entity that was found or ends request with 404
   */
  handleEntityNotFound: (res) => {
    res.status(404).end();
  },

  /**
   * Processes the result to be sent in the response
   * @param  {Object} res                 The response object for the request
   * @param  {Object|Array} entity        The entity to be sent
   * @return {void}                       No return
   */
  respondWithResult: res => (entity) => {
    if (entity) {
      res.status(200).json(entity);
    }
  },

  /**
   * Return an error message in a standardized format
   * @param  {String} successMessage The message to be return in API
   * @return {Number}                The http response code
   */
  respondWithError: res => (message, status = 422) => {
    res.status(status).json({ message });
  },

  /**
   * Return a success message in a standardized format
   * @param  {String} successMessage The message to be return in API
   * @return {Number}                The http response code
   */
  respondWithSuccess: res => (message, status = 200) => {
    res.status(status).json({ message });
  },

  /**
   * Sanitize object with a list of whitelisted attributes.
   * Runs toObject() on Mongoose objects.
   * @param  {Object} object              The object to sanitize
   * @param  {Array}  whitelistAttributes Array of whitelisted attributes as strings
   * @return {Object}                     Object with only whitelisted properties
   */
  sanitizeObject: (object, whitelistAttributes = []) => {
    let sanatizedObject = object;
    if (sanatizedObject) {
      if (Object.prototype.toString.call(object) !== '[object Array]') {
        if (typeof object.toObject === 'function') {
          sanatizedObject = object.toObject();
        }

        _.forOwn(sanatizedObject, (value, key) => {
          if (!_.includes(whitelistAttributes, key)) {
            delete sanatizedObject[key];
          }
        });
      }
    }

    return sanatizedObject;
  },

  /**
   * Handles errors for a request
   * @param  {Function} next The next object from the request
   * @return {Function}      Function to handle errors
   */
  handleError: next => err => next(err),

};

module.exports = Utils;
