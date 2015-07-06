module.exports = (req, res, next) ->
  origin = req.headers.origin or '*'
  res.header 'Access-Control-Allow-Origin', origin
  res.header 'Access-Control-Allow-Credentials', true
  res.header 'Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE'
  res.header 'Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  next()
