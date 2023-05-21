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

    try {
      let apiHost;
      if (process.env.PANOPTES_HOST) {
        const url = new URL(process.env.PANOPTES_HOST);
        apiHost = url.hostname;
      }
      const isProduction = apiHost === 'www.zooniverse.org';
      const publicKey = isProduction ? productionKey : stagingKey;
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
      console.log('API HOST:', process.env.PANOPTES_HOST);
      console.error(error);
      Sentry.captureException(error);
      return {
        status: 401,
        success: false
      };
    }
  }
};
