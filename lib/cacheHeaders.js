module.exports = function(req, res, next) {
  res.header('Cache-Control', 's-maxage=60, stale-while-revalidate');
  return next();
};