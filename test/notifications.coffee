chai = require 'chai'
expect = chai.expect

describe 'Notifications', ->
  describe '#create', ->
    it 'should set creation time'
    it 'should set a default expiration'
    it 'should accept a custom expiration'
  
  describe '#get', ->
    it 'should filter by sessions'
    it 'should filter by user'
    it 'should filter by unseen'
    it 'should filter by expiration'
    it 'should order by creation time'
    it 'should accept a limit'
  
  describe '#markRead', ->
    it 'should mark notifications as read'
  
  describe 'clearExpired', ->
    it 'should remove expired notifications'
