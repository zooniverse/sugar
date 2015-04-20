chai = require 'chai'
expect = chai.expect
Bluebird = require 'bluebird'
PubSub = require '../lib/pub_sub'
pubSub = new PubSub()

describe 'PubSub', ->
  beforeEach -> pubSub = new PubSub()
  
  subscribeTo = (channel) ->
    callback = chai.spy()
    pubSub.subscribe channel, callback
    callback
  
  thennableSpy = ->
    deferred = Bluebird.defer()
    process.nextTick -> deferred.resolve()
    deferred.promise
  
  describe '#subscribe', ->
    it 'should subscribe to a pubsub channel', ->
      pubSub.redis.sub.subscribeAsync = chai.spy thennableSpy
      subscribeTo 'test'
      expect(pubSub.redis.sub.subscribeAsync).to.have.been.called.once.with 'test'
    
    it 'should subscribe to a pubsub pattern', ->
      pubSub.redis.sub.psubscribeAsync = chai.spy thennableSpy
      subscribeTo 'test:*'
      expect(pubSub.redis.sub.psubscribeAsync).to.have.been.called.once.with 'test:*'
    
    it 'should add a listener to a single channel', ->
      pubSub.emitter.on = chai.spy thennableSpy
      fn = ->
      pubSub.subscribe('test', fn).then ->
        expect(pubSub.emitter.on).to.have.been.called.once.with 'test', fn
    
    it 'should add a listener to a pattern', ->
      pubSub.emitter.on = chai.spy thennableSpy
      fn = ->
      pubSub.subscribe('test:*', fn).then ->
        expect(pubSub.emitter.on).to.have.been.called.once.with 'test:*', fn
  
  describe '#unsubscribe', ->
    it 'should unsubscribe from a pubsub channel', ->
      fn = subscribeTo 'test'
      pubSub.redis.sub.unsubscribeAsync = chai.spy thennableSpy
      pubSub.unsubscribe 'test', fn
      expect(pubSub.redis.sub.unsubscribeAsync).to.have.been.called.once.with 'test'
    
    it 'should unsubscribe from a pubsub pattern', ->
      fn = subscribeTo 'test:*'
      pubSub.redis.sub.punsubscribeAsync = chai.spy thennableSpy
      pubSub.unsubscribe 'test:*', fn
      expect(pubSub.redis.sub.punsubscribeAsync).to.have.been.called.once.with 'test:*'
    
    it 'should remove a listener from a single channel', ->
      fn = subscribeTo 'test'
      pubSub.emitter.removeListener = chai.spy thennableSpy
      pubSub.unsubscribe('test', fn).then ->
        expect(pubSub.emitter.removeListener).to.have.been.called.once.with 'test', fn
    
    it 'should remove a listener from a pattern', ->
      fn = subscribeTo 'test:*'
      pubSub.emitter.removeListener = chai.spy thennableSpy
      pubSub.unsubscribe('test:*', fn).then ->
        expect(pubSub.emitter.removeListener).to.have.been.called.once.with 'test:*', fn
  
  describe '#publish', ->
    it 'should publish a messsage to a channel', ->
      pubSub.redis.pub.publishAsync = chai.spy thennableSpy
      pubSub.publish('test', works: true).then ->
        expect(pubSub.redis.pub.publishAsync).to.have.been.called.once.with 'test', '{"works":true}'
  
  describe '#emitMessage', ->
    it 'should proxy a redis event to listeners', ->
      fn = chai.spy()
      pubSub.subscribe('test', fn).then ->
        pubSub.publish('test', works: true).then ->
          Bluebird.delay(1).then ->
            expect(fn).to.have.been.called.once.with works: true
