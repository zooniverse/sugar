Server = require './lib/server'
port = parseInt(process.env.SUGAR_PORT) or 3000
server = new Server()
server.listen port
