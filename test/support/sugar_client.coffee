Bluebird = require 'bluebird'

class SugarClient
  constructor: (sugar, query) ->
    connection = "http://localhost:#{ sugar.port }"
    connection += "?#{ query }" if query
    primus = sugar.primus
    client = primus.Socket connection
    binding = { sugar, primus, client }
    
    methods = ['spark', 'ping', 'subscribeTo', 'keepAliveTimer', 'hasResponse']
    client[method] = @[method].bind binding for method in methods
    @listenTo client
    return client
  
  listenTo: (client) ->
    client.on 'end', -> client.disconnected = true
    client.on 'data', client.hasResponse
  
  spark: ->
    deferred = Bluebird.defer()
    @client.id (id) => deferred.resolve @primus.spark id
    deferred.promise
  
  ping: ->
    deferred = Bluebird.defer()
    @client.write "primus::ping::#{ +new Date() }"
    @client.once 'incoming::pong', -> deferred.resolve()
    deferred.promise
  
  subscribeTo: (channel) ->
    deferred = Bluebird.defer()
    @client.once "subscribedTo::#{ channel }", -> deferred.resolve()
    @client.write action: 'Subscribe', params: { channel: channel }
    deferred.promise
  
  keepAliveTimer: ->
    @client.spark().then (spark) ->
      spark.keepAliveTimer?._monotonicStartTime
  
  hasResponse: (data) ->
    key = if data.type is 'response' then data.action else data.type
    
    switch key
      when 'connection'
        @client.connection = data
        @client.emit 'connected', data
      when 'Subscribe'
        @client.emit "subscribedTo::#{ data.params.channel }", data

module.exports = SugarClient
