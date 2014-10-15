chai = require 'chai'
expect = chai.expect
Bluebird = require 'bluebird'
Notifications = require '../lib/notifications'
notifications = new Notifications()
pg = notifications.pg

describe 'Notifications', ->
  create = (opts = { }) ->
    defaults =
      message: 'test'
      url: 'http://www.example.com'
      category: 'test'
      user_key: 'user:123'
    
    opts[key] = value for key, value of defaults when not opts[key]
    notifications.create opts
  
  createSamples = (opts = { }) ->
    opts[key] = value for key, value of users: 1, sessions: 1, count: 1 when not opts[key]
    { users, sessions, count } = opts
    promises = []
    for i in [1..users]
      for j in [1..count]
        promises.push create(user_key: "user:#{ i }", message: "test:#{ j }")
    
    for i in [1..sessions]
      for j in [1..count]
        promises.push create(user_key: "session:#{ i }", message: "test:#{ j }")
    
    Bluebird.all promises
  
  describe '#create', ->
    it 'should set creation time', ->
      create().then (notification) ->
        t = +new Date()
        expect(+notification.created_at).to.be.within t - 1000, t + 1000
      
    it 'should set a default expiration', ->
      create().then (notification) ->
        expect(+notification.expires_at).to.be.gt + new Date()
    
    it 'should accept a custom expiration', ->
      create(expires_at: '2020-01-01 0:0:0 UTC').then (notification) ->
        expect(notification.expires_at.toJSON()).to.equal '2020-01-01T00:00:00.000Z'
  
  describe '#get', ->
    it 'should filter by sessions', ->
      createSamples(users: 2, sessions: 2, count: 1).then ->
        notifications.get(spark: { userKey: 'session:1' }).then (list) ->
          expect(list.length).to.equal 1
          expect(list[0].user_key).to.equal 'session:1'
    
    it 'should filter by user', ->
      createSamples(users: 2, sessions: 2, count: 1).then ->
        notifications.get(spark: { userKey: 'user:1' }).then (list) ->
          expect(list.length).to.equal 1
          expect(list[0].user_key).to.equal 'user:1'
    
    it 'should filter by unseen', ->
      create(user_key: 'user:1', is_delivered: true).then (readNotification) ->
        createSamples(users: 1, count: 2).then ->
          notifications.get(spark: { userKey: 'user:1' }).then (list) ->
            expect(list.length).to.equal 3
            
            notifications.get(spark: { userKey: 'user:1' }, unread: true).then (list) ->
              expect(list.length).to.equal 2
    
    it 'should filter by expiration', ->
      create(user_key: 'user:1', expires_at: '2000-01-01T00:00:00Z').then (readNotification) ->
        createSamples(users: 1, count: 2).then ->
          notifications.get(spark: { userKey: 'user:1' }).then (list) ->
            expect(list.length).to.equal 2
            expect(list).to.not.include readNotification
    
    it 'should order by creation time', ->
      createSamples(users: 1, count: 5).then ->
        notifications.get(spark: { userKey: 'user:1' }).then (list) ->
          times = (+n.created_at for n in list)
          sortedTimes = (+n.created_at for n in list)
          sortedTimes.sort (a, b) -> b - a
          expect(times).to.deep.equal sortedTimes
    
    it 'should use a default limit', ->
      createSamples(users: 1, count: 25).then ->
        notifications.get(spark: { userKey: 'user:1' }).then (list) ->
          expect(list.length).to.equal 20
    
    it 'should accept a limit', ->
      createSamples(users: 1, count: 5).then ->
        notifications.get(spark: { userKey: 'user:1' }, limit: 3).then (list) ->
          expect(list.length).to.equal 3
    
    it 'should accept an offset', ->
      create(user_key: 'user:1', created_at: '2000-01-01T00:00:00Z').then (oldNotification) ->
        createSamples(users: 1, count: 2).then ->
          notifications.get(spark: { userKey: 'user:1' }, offset: '2014-01-01T00:00:00Z').then (list) ->
            expect(list.length).to.equal 1
            expect(list).to.deep.equal [oldNotification]
  
  describe '#markRead', ->
    it 'should mark notifications as read', ->
      createSamples(users: 1, count: 3).then ->
        notifications.get(spark: { userKey: 'user:1' }).then (listBefore) ->
          id = listBefore[0].id
          notifications.markRead([id]).then ->
            notifications.get(spark: { userKey: 'user:1' }).then (listAfter) ->
              recordAfter = (n for n in listAfter when n.id is id)[0]
              otherRecords = (n for n in listAfter when n.id isnt id)
              expect(recordAfter.is_delivered).to.be.true
              expect(record.is_delivered).to.be.false for record in otherRecords
  
  describe '#clearExpired', ->
    it 'should remove expired notifications', ->
      create(user_key: 'user:1', expires_at: '2000-01-01T00:00:00Z').then (oldNotification) ->
        createSamples(users: 1, count: 2).then ->
          notifications.clearExpired().then ->
            notifications.pg.count('*').from('notifications').where(user_key: 'user:1').then (result) ->
              count = +result[0].count
              expect(count).to.equal 2
