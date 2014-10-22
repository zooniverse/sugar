http = require 'http'
express = require 'express'
bodyParser = require 'body-parser'
morgan = require 'morgan'
Bluebird = require 'bluebird'
Primus = require 'primus'
Panoptes = require './panoptes'
PubSub = require './pub_sub'
Notifications = require './notifications'
Announcements = require './announcements'
Presence = require './presence'

class Server
  constructor: ->
    @pubSub = new PubSub()
    @notifications = new Notifications()
    @announcements = new Announcements()
    @presence = new Presence()
    @_initializeApp()
    @_initializePrimus()
    
    @app.get '/primus.js', @primusAction
    @app.post '/notify', @notifyAction
    @app.post '/announce', @announceAction
    @app.get '/presence', @presenceAction
    @app.get '/active_users', @activeUsersAction
    
    @listen = @listen
  
  close: =>
    @server.close()
    @notifications.close()
    @announcements.close()
  
  _initializeApp: ->
    @app = express()
    @app.use(morgan('dev')) unless process.env.SUGAR_TEST
    @app.use bodyParser.urlencoded extended: true
    @app.use express.static 'public'
    @server = http.createServer @app
  
  _initializePrimus: ->
    @primus = new Primus @server,
      pathname: '/sugar'
      transformer: 'engine.io'
      origins: '*'
    
    @primus.on 'connection', (spark) =>
      delete spark.query.user_id if spark.query.user_id is 'null'
      delete spark.query.auth_token if spark.query.auth_token is 'null'
      delete spark.query.session_id if spark.query.session_id is 'null'
      @authenticate(spark).then =>
        @extendSpark spark
        { userName, loggedIn, userKey } = spark
        spark.write
          type: 'connection'
          userName: spark.userName
          loggedIn: spark.loggedIn
          userKey: spark.userKey
      
      spark.on 'data', (data) =>
        @_dispatchAction spark, data if data and data.action
    
    @primus.on 'disconnection', (spark) -> spark.isGone()
  
  authenticate: (spark) =>
    deferred = Bluebird.defer()
    Panoptes.authenticator(spark.query.user_id, spark.query.auth_token).then (result) ->
      spark.loggedIn = result.loggedIn or false
      spark.userName = result.user if result.loggedIn and result.user
      deferred.resolve result
    .catch (e) ->
      deferred.reject e
    
    deferred.promise
  
  listen: (port) =>
    @server.listen port
  
  renderJSON: (res, json, status = 200) ->
    res.setHeader 'Content-Type', 'application/json'
    res.statusCode = status
    res.end JSON.stringify json
  
  primusAction: (req, res) =>
    res.send @primus.library()
  
  notifyAction: (req, res) =>
    # TO-DO: Authorize notifying user
    params = req.body
    @notifications.create(params).then (notification) =>
      @renderJSON res, notification, 201
      @pubSub.publish params.user_key, notification
    .catch (ex) =>
      console.error ex
      res.status 400
      @renderJSON res, success: false
  
  announceAction: (req, res) =>
    # TO-DO: Authorize announcing user
    params = req.body
    @announcements.create(params).then (announcement) =>
      @renderJSON res, announcement, 201
      @pubSub.publish announcement.scope, announcement
    .catch (ex) =>
      console.error ex
      res.status 400
      @renderJSON res, success: false
  
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
  
  extendSpark: (spark) =>
    spark.subscriptions = []
    spark.pubSub = @pubSub
    spark.presence = @presence
    
    if spark.loggedIn and spark.query.user_id
      spark.userKey = "user:#{ spark.query.user_id }"
    else if spark.query.session_id
      spark.userKey = "session:#{ spark.query.session_id }"
    else
      spark.userKey = "session:#{ spark.id }"
    
    spark.isGone = (->
      for subscription in @subscriptions
        @pubSub.unsubscribe subscription.channel, subscription
        @presence.userInactiveOn subscription.channel, @userKey
    ).bind spark
    
    spark.on 'incoming::ping', (->
      clearTimeout this.keepAliveTimer if this.keepAliveTimer
      this.keepAliveTimer = setTimeout this.isGone, 30000
      for subscription in @subscriptions
        @presence.userActiveOn subscription.channel, @userKey
    ).bind spark
  
  _dispatchAction: (spark, call) =>
    call.params or= { }
    call.params.spark = spark
    @["client#{ call.action }"] call.params
  
  clientSubscribe: (params) =>
    return unless params.channel
    
    callback = ((data) ->
      @spark.write channel: @channel, data: data
    ).bind spark: params.spark, channel: params.channel
    
    callback.channel = params.channel
    params.spark.subscriptions.push callback
    @pubSub.subscribe params.channel, callback
    @presence.userActiveOn params.channel, params.spark.userKey
    params.spark.write type: 'response', action: 'Subscribe', params: { channel: params.channel }
  
  clientGetNotifications: (params) =>
    @notifications.get(params).then (notifications) ->
      params.spark.write type: 'notifications', notifications: notifications
  
  clientReadNotifications: (params) =>
    @notifications.markRead params.ids
    params.spark.write type: 'response', action: 'ReadNotifications', params: { ids: params.ids }
  
  clientGetAnnouncements: (params) =>
    @announcements.get(params).then (announcements) ->
      params.spark.write type: 'announcements', announcements: announcements
  
  clientReadAnnouncements: (params) =>
    @announcements.markRead params
    params.spark.write type: 'response', action: 'ReadAnnouncements', params: { keys: params.keys }
  
  clientEvent: (params) =>
    payload =
      channel: params.channel
      userKey: params.spark.userKey
      type: params.type
      data: params.data or {}
    
    @pubSub.publish "outgoing:#{ params.channel }", payload
    params.spark.write type: 'response', action: 'Event', params: payload

module.exports = Server
