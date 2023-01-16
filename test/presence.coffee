chai = require 'chai'
expect = chai.expect
Bluebird = require 'bluebird'
Presence = require '../lib/presence'
presence = new Presence()

describe 'Presence', ->
  beforeEach -> presence = new Presence()
  
  active = (user, channel) ->
    presence.userActiveOn channel, user
  
  inactive = (user, channel) ->
    presence.userInactiveOn channel, user
  
  activeOn = (channel) ->
    presence.redis.zrangebyscoreAsync("presence:#{ channel }", '-inf', '+inf', 'withscores').then (list) ->
      users = { }
      users[key] = +list[i + 1] for key, i in list by 2
      users
  
  createSamples = ->
    Bluebird.all [
      active('user:1', 'test1')
      active('user:1', 'zooniverse')
      active('user:2', 'test2')
      active('user:2', 'zooniverse')
      active('session:3', 'test3')
      active('session:3', 'zooniverse')
    ]
  
  describe '#userActiveOn', ->
    it 'should set a user as active on a channel', ->
      active('user:123', 'zooniverse').then ->
        activeOn('zooniverse').then (users) ->
          now = +new Date()
          expect(users['user:123']).to.be.within now - 1000, now + 1000
    
    it 'should reject user channels', ->
      active('user:123', 'user:123').then ->
        presence.redis.existsAsync('presence:user:123').then (result) ->
          expect(result).to.equal 0
    
    it 'should reject session channels', ->
      active('session:123', 'session:123').then ->
        presence.redis.existsAsync('presence:session:123').then (result) ->
          expect(result).to.equal 0
  
  describe '#userInactiveOn', ->
    it 'should set a user as inactive on a channel', ->
      presence.redis.zaddAsync('presence:zooniverse', 123, 'user:123').then ->
        inactive('user:123', 'zooniverse').then  ->
          activeOn('zooniverse').then (users) ->
            expect(users).to.not.have.property 'user:123'
    
    it 'should reject user channels', ->
      presence.redis.zaddAsync('presence:user:123', 123, 'user:123').then ->
        inactive('user:123', 'user:123').then ->
          activeOn('user:123').then (users) ->
            expect(users).to.have.property 'user:123'
    
    it 'should reject session channels', ->
      presence.redis.zaddAsync('presence:session:123', 123, 'session:123').then ->
        inactive('session:123', 'session:123').then ->
          activeOn('session:123').then (sessions) ->
            expect(sessions).to.have.property 'session:123'
  
  describe '#clearInactive', ->
    it 'should remove inactive users', ->
      oldDate = +new Date() - 3 * 60 * 1000 # 3 minutes ago
      presence.redis.zaddAsync('presence:zooniverse', oldDate, 'user:1').then ->
        presence.redis.zaddAsync('presence:zooniverse', +new Date(), 'user:2').then ->
          presence.clearInactive().then ->
            activeOn('zooniverse').then (users) ->
              expect(users).to.not.have.property 'user:1'
              expect(users).to.have.property 'user:2'
  
  describe '#channels', ->
    it 'should list the channels with active users', ->
      createSamples().then ->
        presence.channels().then (channels) ->
          expect(channels).to.have.members ['test1', 'test2', 'test3', 'zooniverse']
  
  describe '#countOn', ->
    it 'should count the number of active users on a channel', ->
      createSamples().then ->
        Bluebird.all [
          presence.countOn('zooniverse').then (count) -> expect(count).to.equal 3
          presence.countOn('test1').then (count) -> expect(count).to.equal 1
          presence.countOn('test2').then (count) -> expect(count).to.equal 1
          presence.countOn('test3').then (count) -> expect(count).to.equal 1
        ]
  
  describe '#channelCounts', ->
    it 'should list the number of active users on active channels', ->
      createSamples().then ->
        presence.channelCounts().then (counts) ->
          expect(counts).to.deep.include channel: 'zooniverse', count: 3
          expect(counts).to.deep.include channel: 'test1', count: 1
          expect(counts).to.deep.include channel: 'test2', count: 1
          expect(counts).to.deep.include channel: 'test3', count: 1
  
  describe '#usersOn', ->
    it 'should list the active users on a channel', ->
      createSamples().then ->
        presence.usersOn('zooniverse').then (users) ->
          expect(users).to.have.members ['1', '2']
    
    it 'should not list active sessions', ->
      createSamples().then ->
        presence.usersOn('test3').then (users) ->
          expect(users).to.be.empty
