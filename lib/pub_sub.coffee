RedisClient = require './redis_client'
Events = require 'events'

class PubSub
  constructor: ->
    @emitter = new Events.EventEmitter()
    @redis =
      pub: new RedisClient()
      sub: new RedisClient()
    
    @redis.sub.on 'message', @emitMessage
    @redis.sub.on 'pmessage', @emitMessage
  
  emitMessage: (pattern, channel, message) =>
    @emitter.emit pattern, JSON.parse(message or channel)
  
  subscribe: (pattern, fn) =>
    method = if pattern.match(/\*|\[|\]|\?/) then 'psubscribe' else 'subscribe'
    @redis.sub["#{ method }Async"](pattern).then =>
      @emitter.on pattern, fn
  
  unsubscribe: (pattern, fn) =>
    method = if pattern.match(/\*|\[|\]|\?/) then 'punsubscribe' else 'unsubscribe'
    @redis.sub["#{ method }Async"](pattern).then =>
      @emitter.removeListener pattern, fn
  
  publish: (channel, message) =>
    @redis.pub.publishAsync channel, JSON.stringify(message)

module.exports = PubSub
