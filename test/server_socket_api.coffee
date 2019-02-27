chai = require 'chai'
expect = chai.expect
Bluebird = require 'bluebird'
SugarServer = require './support/sugar_server'

describe 'Server Socket API', ->
  sugar = null
  client = null

  beforeEach ->
    deferred = Bluebird.defer()
    SugarServer.create().then (server) ->
      sugar = server
      client = sugar.createClient 'user_id=1&auth_token=valid_auth'
      client.once 'connected', -> deferred.resolve()
    deferred.promise

  afterEach ->
    SugarServer.closeAll()
    client.end()

  describe '#clientSubscribe', ->
    it 'should subscribe to the channel', ->
      sugar.pubSub.subscribe = chai.spy sugar.pubSub.subscribe

      client.subscribeTo('test').then ->
        expect(sugar.pubSub.subscribe).to.have.been.called.once.with 'test'

    it 'should permit the subscription to the user channel', ->
      sugar.pubSub.subscribe = chai.spy sugar.pubSub.subscribe
      client.subscribeTo('user:1').then ->
        expect(sugar.pubSub.subscribe).to.have.been.called.once.with 'user:1'

    it 'should permit the subscription to the session channel', ->
      client = sugar.createClient()
      client.once 'connected', ->
        sessionKey = client.connection.userKey
        sugar.pubSub.subscribe = chai.spy sugar.pubSub.subscribe
        client.subscribeTo(sessionKey).then ->
          expect(sugar.pubSub.subscribe).to.have.been.called.once.with sessionKey

    it 'should not permit the subscription to other user channels', ->
      sugar.pubSub.subscribe = chai.spy sugar.pubSub.subscribe
      client.subscribeTo 'user:2'
      Bluebird.delay(50).then ->
        expect(sugar.pubSub.subscribe).to.not.have.been.called()

    it 'should not permit the subscription to other session channels', ->
      sugar.pubSub.subscribe = chai.spy sugar.pubSub.subscribe
      client = sugar.createClient()
      client.once 'connected', ->
        client.subscribeTo 'session:somebody-else'
        Bluebird.delay(50).then ->
          expect(sugar.pubSub.subscribe).to.not.have.been.called()

    it 'should store the subscription on the connection', ->
      client.subscribeTo('test').then ->
        client.spark().then (spark) ->
          subscription = spark.subscriptions['test']
          expect(subscription).to.be.a 'function'
          expect(subscription.channel).to.equal 'test'

    it 'should mark the user as active on the channel', ->
      sugar.presence.userActiveOn = chai.spy sugar.presence.userActiveOn
      client.subscribeTo('test').then ->
        expect(sugar.presence.userActiveOn).to.have.been.called.once.with 'test', 'user:1'

  describe '#clientUnsubscribe', ->
    it 'should unsubscribe from the channel', ->
      sugar.pubSub.unsubscribe = chai.spy sugar.pubSub.unsubscribe

      client.subscribeTo('test').then ->
        client.spark().then (spark) ->
          callback = spark.subscriptions.test
          client.unsubscribeFrom('test').then ->
            expect(sugar.pubSub.unsubscribe).to.have.been.called.once.with 'test', callback

    it 'should remove the subscription from the connection', ->
      client.subscribeTo('test').then ->
        client.spark().then (spark) ->
          client.unsubscribeFrom('test').then ->
            subscription = spark.subscriptions['test']
            expect(subscription).to.eql undefined

    it 'should mark the user as inactive on the channel', ->
      sugar.presence.userInactiveOn = chai.spy sugar.presence.userInactiveOn
      client.subscribeTo('test').then ->
        client.unsubscribeFrom('test').then ->
          expect(sugar.presence.userInactiveOn).to.have.been.called.once.with 'test', 'user:1'

  describe '#clientEvent', ->
    it 'should proxy client generated events to redis', ->
      sugar.pubSub.publish = chai.spy sugar.pubSub.publish
      client.sendEvent(channel: 'test', type: 'testing').then ->
        expect(sugar.pubSub.publish).to.have.been.called.once
