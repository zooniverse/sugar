chai = require 'chai'
expect = chai.expect

describe 'Server', ->
  describe 'connecting', ->
    it 'should authenticate logged in users'
    it 'should continue existing sessions'
    
    describe 'heartbeat', ->
      it 'should keep the connection active'
      it 'should mark the user as active'
  
  describe 'disconnecting', ->
    it 'should unsubscribe from all channels'
    it 'should mark the user as inactive'
