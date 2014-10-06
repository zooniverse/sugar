'use strict';

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var Bluebird = require('bluebird');
var request = Bluebird.promisify(require('request'));
var host = process.env.PANOPTES_HOST;

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
