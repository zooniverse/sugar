chai = require 'chai'
expect = chai.expect

describe 'Announcements', ->
  describe '#create', ->
    it 'should set creation time'
    it 'should set a default expiration'
    it 'should accept a custom expiration'
    it 'should create a redis record'
    it 'should set redis creation time'
    it 'should set an expiration on the redis record'
  
  describe '#get', ->
    it 'should filter by unseen'
    it 'should filter by channels'
    it 'should filter by expired'
    it 'should order by creation time'
  
  describe '#markRead', ->
    it 'should mark announcement redis keys'
  
  describe '#clearExpired', ->
    it 'should remove expired announcements'
