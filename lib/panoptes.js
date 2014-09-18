var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var env = process.env.SUGAR_ENV || 'development';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var hosts = {
  development: 'http://localhost:3000'
}

var host = hosts[env];

module.exports = {
  authenticator: function(user_id, auth_token) {
    return true;
    var url = host + '/api/me';
    
    var opts = {
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.api+json; version=1',
        'Authorization': 'Bearer ' + auth_token
      }
    };
    
    return request(opts).spread(function(response, body) {
      return JSON.parse(body).users[0].id === user_id.toString();
    }).catch(function() {
      return false;
    });
  }
};
