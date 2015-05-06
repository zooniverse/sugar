auth = require 'basic-auth'

module.exports = (req, res, next) ->
  credentials = auth req
  authed = credentials \
    and credentials.name is process.env.SUGAR_TALK_USERNAME \
    and credentials.pass is process.env.SUGAR_TALK_PASSWORD
  
  if authed
    next()
  else
    res.writeHead 401, 'WWW-Authenticate': 'Basic realm=notifications.zooniverse.org"'
    res.end()
