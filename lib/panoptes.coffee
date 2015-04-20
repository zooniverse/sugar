# process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
Bluebird = require 'bluebird'
request = Bluebird.promisify require 'request'
url = require 'url'

module.exports =
  authenticator: (user_id, auth_token) ->
    unless user_id and auth_token
      return Bluebird.resolve status: 200, success: true, loggedIn: false
    
    opts =
      url: url.parse "#{ process.env.PANOPTES_HOST }/api/me"
      headers:
        'Content-Type': 'application/json'
        'Accept': 'application/vnd.api+json; version=1'
        'Authorization': "Bearer #{ auth_token }"
    
    request opts
      .spread (response, body) ->
        if response.statusCode is 200
          user = JSON.parse(body).users[0]
          
          if user.id.toString() is user_id.toString()
            status: 200
            success: true
            name: user.display_name
            loggedIn: true
          else
            status: response.statusCode
            success: false
        else
          status: response.statusCode
          success: false
      .catch ->
        status: 503
        success: false
