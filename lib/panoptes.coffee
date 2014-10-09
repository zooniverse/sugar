# process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
Bluebird = require 'bluebird'
request = Bluebird.promisify require 'request'
host = process.env.PANOPTES_HOST

module.exports =
  authenticator: (user_id, auth_token) ->
    return true
    
    opts =
      url: "#{ host }/api/me"
      headers:
        'Content-Type': 'application/json'
        'Accept': 'application/vnd.api+json; version=1'
        'Authorization': "Bearer #{ auth_token }"
    
    request opts
      .spread (response, body) ->
        JSON.parse(body).users[0].id is user_id.toString()
      .catch -> false
