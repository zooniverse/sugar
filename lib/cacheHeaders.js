module.exports = function(req, res, next) {
  res.header('Cache-Control', 'maxage=60, s-maxage=30, stale-while-revalidate');
  return next();
};