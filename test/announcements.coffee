chai = require 'chai'
expect = chai.expect
Bluebird = require 'bluebird'
Announcements = require '../lib/announcements'
announcements = new Announcements()
redis = announcements.redis

describe 'Announcements', ->
  create = (opts = { }) ->
    defaults =
      message: 'test'
      scope: 'zooniverse'
      category: 'testing'
    
    opts[key] = value for key, value of defaults when not opts[key]
    announcements.create opts
  
  createSamples = (samples = { }) ->
    promises = []
    for scope, count of samples
      for i in [1..count]
        promises.push create scope: scope
    
    Bluebird.all promises
  
  getFor = (userKey, opts = { }) ->
    opts.channels or= 'zooniverse'
    opts.spark = { userKey }
    announcements.get opts
  
  describe '#create', ->
    it 'should set creation time', ->
      create().then (announcement) ->
        t = +new Date()
        expect(+announcement.created_at).to.be.within t - 1000, t + 1000
    
    it 'should set a default expiration', ->
      create().then (announcement) ->
        expect(+announcement.expires_at).to.be.gt + new Date()
    
    it 'should accept a custom expiration', ->
      create(expires_at: '2020-01-01 0:0:0 UTC').then (announcement) ->
        expect(announcement.expires_at.toJSON()).to.equal '2020-01-01T00:00:00.000Z'
    
    it 'should create a redis record', ->
      create().then (announcement) ->
        key = "announcements:zooniverse:#{ announcement.id }"
        redis.typeAsync(key).then (type) ->
          expect(type).to.equal 'hash'
    
    it 'should set redis creation time', ->
      create().then (announcement) ->
        key = "announcements:zooniverse:#{ announcement.id }"
        redis.hgetAsync(key, 'created_at').then (value) ->
          expect(value).to.equal announcement.created_at.toString()
    
    it 'should set an expiration on the redis record', ->
      create(expires_at: '2020-01-01 0:0:0 UTC').then (announcement) ->
        key = "announcements:zooniverse:#{ announcement.id }"
        expiresIn = +announcement.expires_at - announcement.created_at
        redis.pttlAsync(key).then (ttl) ->
          expect(ttl).to.be.within expiresIn - 1000, expiresIn + 1000
  
  describe '#get', ->
    it 'should filter by unseen', ->
      createSamples(zooniverse: 2).then (records) ->
        [first, second] = records
        redis.hsetAsync("announcements:zooniverse:#{ first.id }", 'user:123', true).then ->
          getFor('user:123').then (list) ->
            expect(list).to.include second
            expect(list).to.not.include first
    
    it 'should filter by channels', ->
      createSamples(zooniverse: 2, 'projects:test': 3).then ->
        getFor('user:123', channels: 'projects:test').then (list) ->
          expect(list.length).to.equal 3
          expect(item.scope).to.equal 'projects:test' for item in list
    
    it 'should filter by expired', ->
      create().then (announcement) ->
        create(expires_at: '2000-01-01T00:00:00Z').then (oldAnnouncement) ->
          getFor('user:123').then (list) ->
            expect(list).to.include announcement
            expect(list).to.not.include oldAnnouncement
    
    it 'should order by creation time', ->
      createSamples(zooniverse: 5).then ->
        getFor('user:1').then (list) ->
          times = (+n.created_at for n in list)
          sortedTimes = (+n.created_at for n in list)
          sortedTimes.sort (a, b) -> b - a
          expect(times).to.deep.equal sortedTimes
  
  describe '#markRead', ->
    it 'should mark announcement redis keys', ->
      createSamples(zooniverse: 3).then ->
        getFor('user:123').then (listBefore) ->
          [first, second, third] = listBefore
          keys = ("zooniverse:#{ item.id }" for item in [first, second])
          check = (id) -> redis.hgetAsync "announcements:zooniverse:#{ id }", 'user:123'
          
          announcements.markRead(keys: keys, spark: { userKey: 'user:123' }).then ->
            Bluebird.all [
              check(first.id).then (value) -> expect(value).to.equal 'true'
              check(second.id).then (value) -> expect(value).to.equal 'true'
              check(third.id).then (value) -> expect(value).to.be.null
            ]
  
  describe '#clearExpired', ->
    it 'should remove expired announcements', ->
      create(expires_at: '2000-01-01T00:00:00Z').then (oldAnnouncement) ->
        createSamples(zooniverse: 2).then ->
          announcements.clearExpired().then ->
            announcements.pg.count('*').from('announcements').then (result) ->
              count = +result[0].count
              expect(count).to.equal 2
