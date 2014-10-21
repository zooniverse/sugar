chai = require 'chai'
expect = chai.expect
PanoptesServer = require './support/panoptes_server'
Panoptes = require '../lib/panoptes'

describe 'Panoptes', ->
  describe '#authenticator', ->
    it 'should authenticate a user', ->
      Panoptes.authenticator(1, 'valid_auth').then (response) ->
        expect(response.status).to.equal 200
        expect(response.success).to.be.true
        expect(response.loggedIn).to.be.true
        expect(response.name).to.equal 'user1'
    
    it 'should not authenticate invalid credentials', ->
      Panoptes.authenticator(1, 'invalid_auth').then (response) ->
        expect(response.status).to.equal 401
        expect(response.success).to.be.false
        expect(response).to.not.have.property 'loggedIn'
        expect(response).to.not.have.property 'name'
    
    it 'should fail gracefully when the server is down', ->
      Panoptes.authenticator(1, 'down_auth').then (response) ->
        expect(response.status).to.equal 503
        expect(response.success).to.be.false
        expect(response).to.not.have.property 'loggedIn'
        expect(response).to.not.have.property 'name'
    
    it 'should handle not-logged-in users', ->
      Panoptes.authenticator().then (response) ->
        expect(response.status).to.equal 200
        expect(response.success).to.be.true
        expect(response.loggedIn).to.be.false
        expect(response).to.not.have.property 'name'
