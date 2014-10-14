chai = require 'chai'
expect = chai.expect

describe 'Server HTTP API', ->
  describe 'POST /notify', ->
    it 'should authorize the request'
    it 'should create a notification'
    it 'should publish the notification'
  
  describe 'POST /announce', ->
    it 'should authorize the request'
    it 'should create an announcement'
    it 'should publish the announcement'
  
  describe 'GET /presence', ->
    it 'should respond with the number of active users on each channel'
  
  describe 'GET /active_users', ->
    it 'should respond with the logged in users on a channel'
