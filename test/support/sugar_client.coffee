Bluebird = require 'bluebird'

class SugarClient
  constructor: (sugar, query) ->
    connection = "http://localhost:#{ sugar.port }"
    connection += "?#{ query }" if query
    primus = sugar.primus
    client = primus.Socket connection
    binding = { sugar, primus, client }

    methods = [
      'spark', 'pong', 'subscribeTo', 'unsubscribeFrom',
      'sendEvent', 'keepAliveTimer', 'hasResponse'
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

  pong: ->
    deferred = Bluebird.defer()
    # original behaviour
    # client would write a ping message
    # @client.write "primus::ping::#{ +new Date() }"
    # server would respond with a pong
    # and client would dispatch the incoming pong event
    # @client.once 'incoming::pong', -> deferred.resolve()

    # new server -> client behaviour
    # server sends a ping
    # client dispatches the incoming ping event
    @client.emit 'incoming::ping', -> deferred.resolve()
    # client responds with a pong
    @client.write "primus::pong::#{ +new Date() }"

    # console.log(@sugar)
    # console.log(@client)
    #console.log(@primus)

    # another way to test is to manually see if these clear timers work
    # as they are meant to and remove these tests...
    # but why the fuck don't the resolve?!


    deferred.promise

  subscribeTo: (channel) ->
    deferred = Bluebird.defer()
    @client.write action: 'Subscribe', params: { channel: channel }
    @client.once "subscribedTo::#{ channel }", -> deferred.resolve()
    deferred.promise

  unsubscribeFrom: (channel) ->
    deferred = Bluebird.defer()
    @client.write action: 'Unsubscribe', params: { channel: channel }
    @client.once "unsubscribedFrom::#{ channel }", -> deferred.resolve()
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
      when 'Unsubscribe'
        @client.emit "unsubscribedFrom::#{ data.params.channel }", data
      when 'Event'
        @client.emit "sentEvent::#{ data.params.data.id }", data.params

module.exports = SugarClient
