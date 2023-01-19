var SugarServer, chai, expect, request, url;

chai = require('chai');

expect = chai.expect;

url = require('url');

const { promisify } = require('util');
request = promisify(require('request'));

SugarServer = require('./support/sugar_server');

describe('Server HTTP API', function() {
  var get, post, sugar;
  sugar = null;
  beforeEach(function() {
    return SugarServer.create().then(function(server) {
      return sugar = server;
    });
  });
  afterEach(function() {
    return SugarServer.closeAll();
  });
  post = function(path, body, user, pass) {
    return request({
      method: 'POST',
      url: `http://${user}:${pass}@localhost:${sugar.port}${path}`,
      json: true,
      form: body
    });
  };
  get = function(path, params) {
    var uri;
    uri = url.parse(`http://localhost:${sugar.port}${path}`);
    uri.query = params;
    return request({
      method: 'GET',
      url: uri.format(),
      json: true
    });
  };
  describe('GET /presence', function() {
    return it('should respond with the number of active users on each channel', function() {
      sugar.presence.channelCounts = chai.spy(sugar.presence.channelCounts);
      return get('/presence').then(function (response) {
        expect(response.statusCode).to.equal(200);
        return expect(sugar.presence.channelCounts).to.have.been.called.once;
      });
    });
  });
  describe('GET /active_users', function() {
    return it('should respond with the logged in users on a channel', function() {
      sugar.presence.usersOn = chai.spy(sugar.presence.usersOn);
      return get('/active_users', {
        channel: 'testing'
      }).then(function (response) {
        expect(response.statusCode).to.equal(200);
        return expect(sugar.presence.usersOn).to.have.been.called.once.with('testing');
      });
    });
  });
  describe('POST /notify', function() {
    it('should authorize the request', function() {
      return post('/notify', {
        notifications: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      }).then(function (response) {
        return expect(response.statusCode).to.equal(401);
      });
    });
    return it('should publish the notification', function() {
      sugar.pubSub.publish = chai.spy(sugar.pubSub.publish);
      return post('/notify', {
        notifications: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      }, 'testUser', 'testPass').then(function (response) {
        expect(response.statusCode).to.equal(200);
        return expect(sugar.pubSub.publish).to.have.been.called.once.with('user:1');
      });
    });
  });
  describe('POST /announce', function() {
    it('should authorize the request', function() {
      return post('/announce', {
        announcements: [
          {
            message: 'test',
            section: 'zooniverse'
          }
        ]
      }, 'wrong', 'wrong').then(function (response) {
        return expect(response.statusCode).to.equal(401);
      });
    });
    return it('should publish the announcement', function() {
      sugar.pubSub.publish = chai.spy(sugar.pubSub.publish);
      return post('/announce', {
        announcements: [
          {
            message: 'test',
            section: 'zooniverse'
          }
        ]
      }, 'testUser', 'testPass').then(function (response) {
        expect(response.statusCode).to.equal(200);
        return expect(sugar.pubSub.publish).to.have.been.called.once.with('zooniverse');
      });
    });
  });
  return describe('POST /experiment', function() {
    it('should authorize the request', function() {
      return post('/experiment', {
        experiments: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      }).then(function (response) {
        return expect(response.statusCode).to.equal(401);
      });
    });
    return it('should publish the experiment', function() {
      sugar.pubSub.publish = chai.spy(sugar.pubSub.publish);
      return post('/experiment', {
        experiments: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      }, 'testUser', 'testPass').then(function (response) {
        expect(response.statusCode).to.equal(200);
        return expect(sugar.pubSub.publish).to.have.been.called.once.with('user:1');
      });
    });
  });
});
