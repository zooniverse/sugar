Bluebird = require 'bluebird'

class SugarClient
  constructor: (sugar, query) ->
    connection = "http://localhost:#{ sugar.port }"
    connection += "?#{ query }" if query
    primus = sugar.primus
    client = primus.Socket connection
    binding = { sugar, primus, client }
    
    methods = [
      'spark', 'ping', 'subscribeTo', 'sendEvent',
      'keepAliveTimer', 'hasResponse'
    ]
    
    client[method] = @[method].bind binding for method in methods
    @listenTo client
    return client
  
  listenTo: (client) ->
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
    
  sendEvent: (opts = { }) ->
    deferred = Bluebird.defer()
    @client.eventId or= 0
    @client.eventId += 1
    opts.data or= { }
    opts.data.id = @client.eventId
    @client.once "sentEvent::#{ opts.data.id }", (payload) -> deferred.resolve payload
    @client.write action: 'Event', params: opts
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
      when 'Event'
        @client.emit "sentEvent::#{ data.params.data.id }", data.params

module.exports = SugarClient
