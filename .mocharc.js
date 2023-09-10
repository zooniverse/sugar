'use strict';

module.exports = {
  reporter: 'spec',
  checkLeaks: true,
  global:['__SENTRY__'],
  slow: 300,
  recursive: true,
  exit: true
};
