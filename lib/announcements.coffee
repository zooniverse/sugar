Bluebird = require 'bluebird'
RedisClient = require './redis_client'
PostgresClient = require './postgres_client'

class Announcements
  constructor: ->
    @redis = new RedisClient()
    @pg = new PostgresClient()
    setInterval @clearExpired, 60 * 60 * 1000 # Clear expired once per hour
  
  close: =>
    @pg.close()
  
  create: (params) =>
    params.created_at or= @pg.now()
    params.expires_at or= @pg.fromNow 30, 'day'
    
    @pg.insert(params).into('announcements').returning('*').then (data) =>
      record = data[0]
      redisKey = "announcements:#{ record.scope }:#{ record.id }"
      
      @redis.multi()
        .hset redisKey, 'created_at', record.created_at
        .pexpireat redisKey, +record.expires_at
        .exec()
      
      record
  
  get: (opts) =>
    userKey = opts.spark.userKey
    deferred = Bluebird.defer()
    @_getRecords(opts).filter (announcement) =>
      @_hasSeen userKey, announcement
    .then (filtered) ->
      deferred.resolve filtered
    
    deferred.promise
  
  markRead: (params) =>
    return if not params.keys or params.keys.length is 0
    multi = @redis.multi()
    params.keys.forEach (key) ->
      multi = multi.hset "announcements:#{ key }", params.spark.userKey, true
    
    multi.execAsync()
  
  clearExpired: =>
    @pg 'announcements'
      .where 'expires_at', '<', @pg.now()
      .del()
      .exec()
  
  _getRecords: (opts) ->
    channels = opts.channels or []
    channels = [channels] if typeof channels is 'string'
    return @pg.emptySet() if channels.length is 0
    deferred = Bluebird.defer()
    
    @pg.select '*'
      .from 'announcements'
      .whereIn 'scope', channels
      .where 'expires_at', '>', @pg.now()
      .orderBy 'created_at', 'desc'
      .then (announcements) -> deferred.resolve announcements
    
    deferred.promise
  
  _hasSeen: (userKey, announcement) ->
    redisKey = "announcements:#{ announcement.scope }:#{ announcement.id }"
    @redis.hexistsAsync(redisKey, userKey).then (result) -> result is 0

module.exports = Announcements
