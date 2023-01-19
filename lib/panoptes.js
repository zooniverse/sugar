var request, url;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { promisify } = require('util');
request = promisify(require('request'));

url = require('url');

module.exports = {
  authenticator: function(user_id, auth_token) {
    var opts;
    if (!(user_id && auth_token)) {
      return Promise.resolve({
        status: 200,
        success: true,
        loggedIn: false
      });
    }
    opts = {
      url: url.parse(`${process.env.PANOPTES_HOST}/api/me`),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.api+json; version=1',
        'Authorization': `Bearer ${auth_token}`
      }
    };
    return request(opts).then(function(response) {
      var user;
      if (response.statusCode === 200) {
        user = JSON.parse(response.body).users[0];
        if (user.id.toString() === user_id.toString()) {
          return {
            status: 200,
            success: true,
            name: user.display_name,
            loggedIn: true
          };
        } else {
          return {
            status: response.statusCode,
            success: false
          };
        }
      } else {
        return {
          status: response.statusCode,
          success: false
        };
      }
    }).catch(function() {
      return {
        status: 503,
        success: false
      };
    });
  }
};
