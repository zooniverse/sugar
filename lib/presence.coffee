Bluebird = require 'bluebird'
RedisClient = require './redis_client'

class Presence
  constructor: ->
    @redis = new RedisClient()
    setInterval @clearInactive, 1 * 60 * 1000 # Clear inactive every minute
  
  userActiveOn: (channel, userKey) =>
    return if @_isUserChannel channel
    @redis.zaddAsync "presence:#{ channel }", +new Date(), userKey
  
  userInactiveOn: (channel, userKey) =>
    return if @_isUserChannel channel
    @redis.zremAsync "presence:#{ channel }", userKey
  
  clearInactive: =>
    twoMinutesAgo = -2 * 60 * 1000 + (+new Date())
    @channels().then (channels) =>
      for channel in channels
        @redis.zremrangebyscoreAsync "presence:#{ channel }", '-inf', twoMinutesAgo
  
  channelCounts: =>
    deferred = Bluebird.defer()
    
    @channels().then (channels) =>
      countingPromises = channels.map (channel) =>
        @countOn(channel).then (count) ->
          channel: channel
          count: count
      
      Bluebird.all(countingPromises).then (allCounts) ->
        deferred.resolve allCounts
    
    deferred.promise
  
  channels: =>
    @_scan(method: 'scan', pattern: 'presence:*').then (keys) ->
      keys.map (key) -> key.match(/presence:(.*$)/)[1]
  
  countOn: (channel) =>
    @redis.zcardAsync "presence:#{ channel }"
  
  usersOn: (channel) =>
    @_scan(method: 'zscan', key: "presence:#{ channel }", pattern: 'user:*').then (values) ->
      values.filter (key, i) -> i % 2 is 0
        .map (key) -> key.replace /^user:/, ''
  
  _scan: (opts) =>
    deferred = Bluebird.defer()
    opts[k] = v for k, v of cursor: '0', results: [], deferred: deferred
    @__scan opts
    deferred.promise
  
  __scan: (opts) =>
    @_scanner(opts).then (values) =>
      opts.results = opts.results.concat values[1]
      if values[0] is '0'
        opts.deferred.resolve opts.results
      else
        opts.cursor = values[0]
        @__scan opts
  
  _scanner: (opts) =>
    if opts.method is 'scan'
      @redis.scanAsync opts.cursor, 'match', opts.pattern
    else
      @redis["#{ opts.method }Async"] opts.key, opts.cursor, 'match', opts.pattern
  
  _isUserChannel: (channel) ->
    !!channel.match /(session|user):/

module.exports = Presence
