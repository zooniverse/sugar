import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import Panoptes from '../lib/panoptes.js';

describe('Panoptes', function() {
  return describe('#authenticator', function() {
    it('should authenticate a user', function() {
      const data = {
        id: 1,
        dname: 'user1'
      };
      jwt.verify = chai.spy(() => {
        return { data }
      });
      return Panoptes.authenticator(1, 'valid_auth').then(function(response) {
        expect(response.status).to.equal(200);
        expect(response.success).to.be.true;
        expect(response.loggedIn).to.be.true;
        return expect(response.name).to.equal('user1');
      });
    });

    it('should not authenticate invalid credentials', function() {
      jwt.verify = chai.spy(() => {
        throw new Error('invalid token');
      });
      chai.spy.on(Sentry, 'captureException');
      return Panoptes.authenticator(1, 'invalid_auth').then(function(response) {
        expect(response.status).to.equal(401);
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
