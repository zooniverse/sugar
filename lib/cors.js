const Sentry = require('@sentry/node');

function sanitiseOrigin(origin) {
  try {
    const url = new URL(origin);

    if (url.hostname === 'localhost') {
      return url.origin;
    }

    if (url.protocol === 'https:' && url.hostname.endsWith('.zooniverse.org')) {
      return url.origin
    }
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
  }

  return '*'
}

module.exports = function(req, res, next) {
  const origin = req.headers.origin ? sanitiseOrigin(req.headers.origin) : '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', origin !== '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  return next();
};
