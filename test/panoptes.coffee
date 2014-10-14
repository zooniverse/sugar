chai = require 'chai'
expect = chai.expect

describe 'Panoptes', ->
  describe '#authenticator', ->
    it 'should authenticate a user'
    it 'should not authenticate invalid credentials'
    it 'should fail gracefully when the server is down'
    it 'should handle not-logged-in users'
