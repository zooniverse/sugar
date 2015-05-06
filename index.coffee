Server = require './lib/server'
port = parseInt(process.env.SUGAR_PORT) or 2999
server = new Server()
server.listen port
