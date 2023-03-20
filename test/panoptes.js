const chai = require('chai');

const expect = chai.expect;

const PanoptesServer = require('./support/panoptes_server');

const Panoptes = require('../lib/panoptes');

describe('Panoptes', function() {
  beforeEach(function () {
    PanoptesServer.mock();
  })

  return describe('#authenticator', function() {
    it('should authenticate a user', function() {
      return Panoptes.authenticator(1, 'valid_auth').then(function(response) {
        expect(response.status).to.equal(200);
        expect(response.success).to.be.true;
        expect(response.loggedIn).to.be.true;
        return expect(response.name).to.equal('user1');
      });
    });

    it('should not authenticate invalid credentials', function() {
      return Panoptes.authenticator(1, 'invalid_auth').then(function(response) {
        expect(response.status).to.equal(401);
        expect(response.success).to.be.false;
        expect(response).to.not.have.property('loggedIn');
        return expect(response).to.not.have.property('name');
      });
    });

    it('should fail gracefully when the server is down', function() {
      return Panoptes.authenticator(1, 'down_auth').then(function(response) {
        expect(response.status).to.equal(503);
        expect(response.success).to.be.false;
        expect(response).to.not.have.property('loggedIn');
        return expect(response).to.not.have.property('name');
      });
    });

    it('should handle not-logged-in users', function() {
      return Panoptes.authenticator().then(function(response) {
        expect(response.status).to.equal(200);
        expect(response.success).to.be.true;
        expect(response.loggedIn).to.be.false;
        return expect(response).to.not.have.property('name');
      });
    });
  });
});
