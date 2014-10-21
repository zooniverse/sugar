Bluebird = require 'bluebird'
Server = require '../../lib/server'
SugarClient = require './sugar_client'

class SugarServer
  @servers = []
  
  @create: ->
    deferred = Bluebird.defer()
    sugar = new Server()
    sugar.port = 1024
    
    sugar.server.on 'error', (e) ->
      if e.errno is 'EADDRINUSE'
        sugar.port++
        sugar.listen sugar.port
      else
        throw e
    
    sugar.server.on 'listening', ->
      sugar.createClient = (query) ->
        new SugarClient sugar, query
      
      deferred.resolve sugar
    
    sugar.listen sugar.port
    SugarServer.servers.push sugar
    deferred.promise
  
  @closeAll: ->
    for sugar in SugarServer.servers
      sugar.server.close()
    
    SugarServer.servers = []
    Bluebird.resolve()

module.exports = SugarServer
