chai = require 'chai'
expect = chai.expect
Bluebird = require 'bluebird'
SugarServer = require './support/sugar_server'

describe 'Server', ->
  sugar = null
  client = null
  
  beforeEach ->
    SugarServer.create().then (server) ->
      sugar = server
  
  afterEach ->
    SugarServer.closeAll()
    client?.end()
  
  describe 'connecting', ->
    it 'should authenticate logged in users', (done) ->
      client = sugar.createClient 'user_id=1&auth_token=valid_auth'
      client.once 'connected', (connection) ->
        expect(connection.type).to.equal 'connection'
        expect(connection.loggedIn).to.be.true
        expect(connection.userKey).to.equal 'user:1'
        done()
    
    it 'should continue existing sessions', (done) ->
      client = sugar.createClient 'user_id=null&auth_token=null'
      client.once 'connected', (connection) ->
        expect(connection.type).to.equal 'connection'
        expect(connection.loggedIn).to.be.false
        expect(connection.userKey).to.match /^session:/
        done()
    
    describe 'heartbeat', ->
      it 'should keep the connection active', (done) ->
        client = sugar.createClient 'user_id=1&auth_token=valid_auth'
        
        client.ping().then ->
          expect(client.keepAliveTimer).to.change.when(client.ping).then done
      
      it 'should mark the user as active', (done) ->
        client = sugar.createClient 'user_id=1&auth_token=valid_auth'
        sugar.presence.userActiveOn = chai.spy sugar.presence.userActiveOn
        
        client.once 'connected', ->
          client.subscribeTo('zooniverse').then ->
            client.ping().then ->
              expect(sugar.presence.userActiveOn).to.have.been.called.with('zooniverse', 'user:1').at.least.once
              done()
  
  describe 'disconnecting', ->
    it 'should clear the keepAliveTimer', (done) ->
      client = sugar.createClient()
      client.spark().then (spark) ->
        client.ping().then ->
          expect(spark.keepAliveTimer).to.not.eql null
          spark.end()
          expect(spark.keepAliveTimer).to.eql null
          done()
    
    it 'should unsubscribe from all channels', (done) ->
      client = sugar.createClient 'user_id=1&auth_token=valid_auth'
      client.once 'connected', ->
        sugar.pubSub.unsubscribe = chai.spy sugar.pubSub.unsubscribe
        
        client.on 'end', ->
          expect(sugar.pubSub.unsubscribe).to.have.been.called(3).times
          done()
        
        Bluebird.all(client.subscribeTo channel for channel in ['foo', 'bar', 'baz']).then ->
          client.spark().then (spark) -> spark.end()
    
    it 'should mark the user as inactive', (done) ->
      client = sugar.createClient 'user_id=1&auth_token=valid_auth'
      client.once 'connected', ->
        sugar.presence.userActiveOn = chai.spy sugar.presence.userActiveOn
        
        client.on 'end', ->
          expect(sugar.presence.userActiveOn).to.have.been.called.once.with('projects:testing', 'user:1')
          done()
        
        client.subscribeTo('projects:testing').then -> client.end()
