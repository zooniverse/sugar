fs = require 'fs'
path = require 'path'

configPath = path.resolve __dirname, 'config.json'

if fs.existsSync configPath
  config = JSON.parse fs.readFileSync configPath
  for key, value of config
    process.env[key.toUpperCase()] = value
