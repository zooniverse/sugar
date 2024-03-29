// Generated by CoffeeScript 2.7.0
var config, configPath, fs, key, path, value;

fs = require('fs');

path = require('path');

configPath = path.resolve(__dirname, 'config.json');

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath));
  for (key in config) {
    value = config[key];
    process.env[key.toUpperCase()] = value;
  }
}
