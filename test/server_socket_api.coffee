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
    it 'should subscribe to the channel', (done) ->
      sugar.pubSub.subscribe = chai.spy sugar.pubSub.subscribe
      
      client.subscribeTo('test').then ->
        expect(sugar.pubSub.subscribe).to.have.been.called.once.with 'test'
        done()
    
    it 'should store the subscription on the connection', (done) ->
      client.subscribeTo('test').then ->
        client.spark().then (spark) ->
          subscription = spark.subscriptions[0]
          expect(subscription).to.be.a 'function'
          expect(subscription.channel).to.equal 'test'
          done()
    
    it 'should mark the user as active on the channel', (done) ->
      sugar.presence.userActiveOn = chai.spy sugar.presence.userActiveOn
      client.subscribeTo('test').then ->
        expect(sugar.presence.userActiveOn).to.have.been.called.once.with 'test', 'user:1'
        done()
  
  describe '#clientEvent', ->
    it 'should proxy client generated events to redis', (done) ->
      sugar.pubSub.publish = chai.spy sugar.pubSub.publish
      client.sendEvent(channel: 'test', type: 'testing').then ->
        expect(sugar.pubSub.publish).to.have.been.called.once
        done()
