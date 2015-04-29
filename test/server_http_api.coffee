chai = require 'chai'
expect = chai.expect
url = require 'url'
Bluebird = require 'bluebird'
request = Bluebird.promisify require 'request'
SugarServer = require './support/sugar_server'

describe 'Server HTTP API', ->
  sugar = null
  
  beforeEach ->
    SugarServer.create().then (server) ->
      sugar = server
  
  afterEach ->
    SugarServer.closeAll()
  
  post = (path, body) ->
    request
      method: 'POST'
      url: "http://localhost:#{ sugar.port }#{ path }"
      json: true
      form: body
  
  get = (path, params) ->
    uri = url.parse "http://localhost:#{ sugar.port }#{ path }"
    uri.query = params
    request method: 'GET', url: uri.format(), json: true
  
  describe 'GET /presence', ->
    it 'should respond with the number of active users on each channel', ->
      sugar.presence.channelCounts = chai.spy sugar.presence.channelCounts
      get('/presence').spread (response, body) ->
        expect(response.statusCode).to.equal 200
        expect(sugar.presence.channelCounts).to.have.been.called.once
  
  describe 'GET /active_users', ->
    it 'should respond with the logged in users on a channel', ->
      sugar.presence.usersOn = chai.spy sugar.presence.usersOn
      get('/active_users', channel: 'testing').spread (response, body) ->
        expect(response.statusCode).to.equal 200
        expect(sugar.presence.usersOn).to.have.been.called.once.with 'testing'
  
  describe 'POST /notify', ->
    it 'should authorize the request'
    
    it 'should publish the notification', ->
      sugar.pubSub.publish = chai.spy sugar.pubSub.publish
      post '/notify',
        notifications: [
          user_id: 1
          message: 'test'
          url: 'test'
          section: 'zooniverse'
          delivered: false
        ]
      .spread (response, body) ->
        expect(response.statusCode).to.equal 200
        expect(sugar.pubSub.publish).to.have.been.called.once.with 'user:1'
  
  describe 'POST /announce', ->
    it 'should authorize the request'
    
    it 'should publish the announcement', ->
      sugar.pubSub.publish = chai.spy sugar.pubSub.publish
      post '/announce',
        announcements: [
          message: 'test'
          section: 'zooniverse'
        ]
      .spread (response, body) ->
        expect(response.statusCode).to.equal 200
        expect(sugar.pubSub.publish).to.have.been.called.once.with 'zooniverse'
