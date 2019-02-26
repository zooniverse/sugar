RedisClient = require './redis_client'
Events = require 'events'
Events.EventEmitter.defaultMaxListeners = 0

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
    @emitter.removeListener pattern, fn
    listeners = @emitter.listenerCount(pattern)
    @redis.sub["#{ method }Async"](pattern) if listeners is 0

  publish: (channel, message) =>
    @redis.pub.publishAsync channel, JSON.stringify(message)

module.exports = PubSub
