'use strict';

module.exports = {
  reporter: 'spec',
  checkLeaks: true,
  slow: 300,
  require: [
    'coffeescript/register'
  ],
  file: 'test/index.coffee',
  recursive: true,
  extension: 'coffee',
  exit: true
};