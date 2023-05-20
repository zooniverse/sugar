const jwt = require('jsonwebtoken');
const Sentry = require('@sentry/node');
const { productionKey, stagingKey } = require('./publicKeys');

module.exports = {
  authenticator: async function(user_id, auth_token) {
    if (!(user_id && auth_token)) {
      return Promise.resolve({
        status: 200,
        success: true,
        loggedIn: false
      });
    }
    const isProduction = process.env.PANOPTES_HOST === 'https://www.zooniverse.org';
    const publicKey = isProduction ? productionKey : stagingKey;
    try {
      const { 
        data: { 
          id,
          login,
          dname,
          scope,
          admin
        }
      } = jwt.verify(auth_token, publicKey);
      if (id.toString() === user_id.toString()) {
        return {
          status: 200,
          success: true,
          name: dname,
          loggedIn: true
        };
      } else {
        return {
          status: 403,
          success: false
        };
      }
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
      return {
        status: 401,
        success: false
      };
    }
  }
};
