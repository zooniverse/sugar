chai = require 'chai'
expect = chai.expect

describe 'Presence', ->
  describe '#userActiveOn', ->
    it 'should reject system channels'
    it 'should set a user as active on a channel'
  
  describe '#userInactiveOn', ->
    it 'should reject system channels'
    it 'should set a user as inactive on a channel'
  
  describe '#clearInactive', ->
    it 'should remove inactive users'
  
  describe '#channels', ->
    it 'should list the channels with active users'
  
  describe '#countOn', ->
    it 'should count the number of active users on a channel'
  
  describe '#channelCounts', ->
    it 'should list the number of active users on active channels'
  
  describe '#usersOn', ->
    it 'should list the active users on a channel'
    it 'should not list active sessions'
