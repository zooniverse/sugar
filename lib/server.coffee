http = require 'http'
express = require 'express'
bodyParser = require 'body-parser'
morgan = require 'morgan'
Bluebird = require 'bluebird'
Primus = require 'primus'
Panoptes = require './panoptes'
PubSub = require './pub_sub'
Presence = require './presence'
basicAuth = require './basic_auth'
cors = require './cors'

class Server
  constructor: ->
    @pubSub = new PubSub()
    @presence = new Presence()
    @_initializeApp()
    @_initializePrimus()
    
    @app.get '/primus.js', @primusAction
    @app.get '/presence', @presenceAction
    @app.get '/active_users', @activeUsersAction
    @app.post '/notify', basicAuth, @notifyAction
    @app.post '/announce', basicAuth, @announceAction
    
    @listen = @listen
  
  close: =>
    @server.close()
  
  _initializeApp: ->
    @app = express()
    @app.use(morgan('dev')) unless process.env.SUGAR_TEST
    @app.use cors
    @app.use bodyParser.json()
    @app.use bodyParser.urlencoded(extended: true)
    @app.use express.static 'public'
    @server = http.createServer @app
  
  _initializePrimus: ->
    @primus = new Primus @server,
      pathname: '/sugar'
      transformer: 'engine.io'
      origins: '*'
    
    @primus.on 'connection', (spark) =>
      clearTimeout spark.keepAliveTimer if spark.keepAliveTimer
      spark.keepAliveTimer = null
      delete spark.query.user_id if spark.query.user_id is 'null'
      delete spark.query.auth_token if spark.query.auth_token is 'null'
      
      @authenticate(spark).then =>
        @extendSpark spark
        { userName, loggedIn, userKey } = spark
        
        spark.on 'data', (data) =>
          @_dispatchAction spark, data if data and data.action
        
        spark.write
          type: 'connection'
          userName: spark.userName
          loggedIn: spark.loggedIn
          userKey: spark.userKey
    
    @primus.on 'disconnection', (spark) -> spark.isGone?()
  
  authenticate: (spark) =>
    deferred = Bluebird.defer()
    Panoptes.authenticator(spark.query.user_id, spark.query.auth_token).then (result) ->
      spark.loggedIn = result.loggedIn or false
      spark.userName = result.user if result.loggedIn and result.user
      deferred.resolve result
    .catch (e) ->
      deferred.reject e
    
    deferred.promise
  
  authorize: (spark, channel) =>
    return true unless channel.match /^(user|session)/
    channel is spark.userKey
  
  listen: (port) =>
    @server.listen port
  
  renderJSON: (res, json, status = 200) ->
    res.setHeader 'Content-Type', 'application/json'
    res.statusCode = status
    res.end JSON.stringify json
  
  primusAction: (req, res) =>
    res.send @primus.library()
  
  presenceAction: (req, res) =>
    @presence.channelCounts().then (counts) =>
      @renderJSON res, counts
    .catch (ex) =>
      console.error ex
      res.status 500
      @renderJSON res, success: false
  
  activeUsersAction: (req, res) =>
    params = req.query
    @presence.usersOn(params.channel).then (users) =>
      @renderJSON res, users
    .catch (ex) =>
      console.error ex
      res.status 500
      @renderJSON res, success: false
  
  notifyAction: (req, res) =>
    params = req.body
    for notification in params.notifications
      userKey = "user:#{ notification.user_id }"
      notification.type = 'notification'
      @pubSub.publish userKey, notification
    @renderJSON res, params.notifications
  
  announceAction: (req, res) =>
    params = req.body
    for announcement in params.announcements
      announcement.type = 'announcement'
      @pubSub.publish announcement.section, announcement
    @renderJSON res, params.announcements
  
  extendSpark: (spark) =>
    spark.subscriptions = { }
    spark.pubSub = @pubSub
    spark.presence = @presence
    spark.sessionId = spark.id
    
    if spark.loggedIn and spark.query?.user_id
      spark.userKey = "user:#{ spark.query.user_id }"
    else
      spark.userKey = "session:#{ spark.id }"
    
    spark.isGone = (->
      clearTimeout @keepAliveTimer if @keepAliveTimer
      @keepAliveTimer = null
      for channel, subscription of @subscriptions
        @pubSub.unsubscribe channel, subscription
        @presence.userInactiveOn channel, @userKey
    ).bind spark
    
    spark.on 'incoming::ping', (->
      clearTimeout @keepAliveTimer if @keepAliveTimer
      @keepAliveTimer = setTimeout @isGone, 30000
      for channel, subscription of @subscriptions
        @presence.userActiveOn channel, @userKey
    ).bind spark
  
  _dispatchAction: (spark, call) =>
    call.params or= { }
    call.params.spark = spark
    @["client#{ call.action }"] call.params
  
  clientSubscribe: (params) =>
    return unless params.channel
    return if params.spark.subscriptions[params.channel]
    return unless @authorize(params.spark, params.channel)
    
    callback = ((data) ->
      @spark.write channel: @channel, type: data.type, data: data
    ).bind spark: params.spark, channel: params.channel
    
    callback.channel = params.channel
    params.spark.subscriptions[params.channel] = callback
    @pubSub.subscribe params.channel, callback
    @presence.userActiveOn params.channel, params.spark.userKey
    params.spark.write type: 'response', action: 'Subscribe', params: { channel: params.channel }
  
  clientUnsubscribe: (params) =>
    return unless params.channel
    subscription = params.spark.subscriptions[params.channel]
    return unless subscription
    delete params.spark.subscriptions[params.channel]
    
    @pubSub.unsubscribe subscription.channel, subscription
    @presence.userInactiveOn subscription.channel, params.spark.userKey
    params.spark.write type: 'response', action: 'Unsubscribe', params: { channel: params.channel }
  
  clientEvent: (params) =>
    payload =
      channel: params.channel
      userKey: params.spark.userKey
      type: params.type
      data: params.data or {}
    
    @pubSub.publish "outgoing:#{ params.channel }", payload
    params.spark.write type: 'response', action: 'Event', params: payload

module.exports = Server
