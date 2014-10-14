chai = require 'chai'
expect = chai.expect

describe 'Server Socket API', ->
  describe '#clientSubscribe', ->
    it 'should subscribe to the channel'
    it 'should store the subscription on the connection'
    it 'should mark the user as active on the channel'
  
  describe '#clientGetNotifications', ->
    it 'should find notifications for the user'
  
  describe '#clientReadAnnouncements', ->
    it 'should mark the notifications as read for the user'
  
  describe '#clientGetAnnouncements', ->
    it 'should find announcements for the user'
  
  describe '#clientReadAnnouncements', ->
    it 'should mark the announcements as read for the user'
  
  describe '#clientEvent', ->
    it 'should proxy client generated events to redis'
