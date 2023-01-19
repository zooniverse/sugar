var MockPrimus, SugarClient, chai, expect,
  hasProp = {}.hasOwnProperty;

chai = require('chai');

expect = chai.expect;

SugarClient = require('../lib/client');

MockPrimus = require('./support/mock_primus');

describe('SugarClient', function() {
  var callback1, callback2, originalConsole, sessionClient, setupEvents, userClient;
  userClient = sessionClient = callback1 = callback2 = null;
  setupEvents = function() {
    callback1 = chai.spy();
    callback2 = chai.spy();
    return userClient.events = {
      event1: [callback1, callback2],
      event2: [callback2]
    };
  };
  originalConsole = console.info;
  beforeEach(function() {
    var _, key;
    console.info = function() {};
    SugarClient.prototype.Primus = MockPrimus;
    for (key in MockPrimus) {
      if (!hasProp.call(MockPrimus, key)) continue;
      _ = MockPrimus[key];
      MockPrimus[key] = chai.spy(MockPrimus[key]);
    }
    userClient = new SugarClient('user', 'auth');
    return sessionClient = new SugarClient();
  });
  afterEach(function() {
    return console.info = originalConsole;
  });
  describe('initializing', function() {
    it('should set userId', function() {
      return expect(userClient.userId).to.eql('user');
    });
    it('should set authToken', function() {
      return expect(userClient.authToken).to.eql('auth');
    });
    it('should start without events', function() {
      return expect(sessionClient.events).to.eql({});
    });
    it('should start without subscriptions', function() {
      return expect(sessionClient.subscriptions).to.eql({});
    });
    return describe('primus', function() {
      it('should connect', function() {
        return expect(MockPrimus.connect).to.have.been.called;
      });
      it('should listen to outgoing::url', function() {
        return expect(MockPrimus.on).to.have.been.called.with('outgoing::url', sessionClient.primusUrl);
      });
      return it('should listen to data', function() {
        return expect(MockPrimus.on).to.have.been.called.with('data', sessionClient.receiveData);
      });
    });
  });
  describe('#primusUrl', function() {
    describe('when logged in', function() {
      return it('should set the query string', function() {
        var baseUrl;
        baseUrl = {
          query: null
        };
        userClient.primusUrl(baseUrl);
        return expect(baseUrl.query).to.eql('user_id=user&auth_token=auth');
      });
    });
    return describe('when not logged in', function() {
      return it('should not set the query string', function() {
        var baseUrl;
        baseUrl = {
          query: null
        };
        sessionClient.primusUrl(baseUrl);
        return expect(baseUrl.query).to.be(null);
      });
    });
  });
  describe('#connect', function() {
    it('should disconnect', function() {
      sessionClient.disconnect = chai.spy();
      sessionClient.connect();
      return expect(sessionClient.disconnect).to.have.been.called();
    });
    return it('open a new connection', function() {
      sessionClient.connect();
      return expect(MockPrimus.open).to.have.been.called();
    });
  });
  describe('#disconnect', function() {
    it('should remove invalid subscriptions', function() {
      userClient.subscriptions['valid'] = true;
      userClient.subscriptions['session:asdf'] = true;
      userClient.subscriptions['user:not-me'] = true;
      userClient.disconnect();
      return expect(userClient.subscriptions).to.eql({
        valid: true
      });
    });
    it('should reset loggedIn', function() {
      userClient.loggedIn = true;
      userClient.disconnect();
      return expect(userClient.loggedIn).to.eql(null);
    });
    it('should reset userKey', function() {
      userClient.userKey = 'user:123';
      userClient.disconnect();
      return expect(userClient.userKey).to.eql(null);
    });
    return it('should end the connection', function() {
      userClient.disconnect();
      return expect(MockPrimus.end).to.have.been.called();
    });
  });
  describe('#receiveData', function() {
    describe('with data', function() {
      return it('should emit', function() {
        userClient.emit = chai.spy();
        userClient.receiveData({
          foo: 'bar'
        });
        return expect(userClient.emit).to.have.been.called.with({
          foo: 'bar'
        });
      });
    });
    describe('with a connection', function() {
      beforeEach(function() {
        userClient.__subscribeToChannels = chai.spy();
        return userClient.receiveData({
          type: 'connection',
          loggedIn: 'state',
          userKey: 'key'
        });
      });
      it('should set loggedIn', function() {
        return expect(userClient.loggedIn).to.eql('state');
      });
      it('should set userKey', function() {
        return expect(userClient.userKey).to.eql('key');
      });
      it('should add user subscription', function() {
        return expect(userClient.subscriptions).to.include({
          key: true
        });
      });
      it('should subscribe to channels', function() {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            expect(userClient.__subscribeToChannels).to.have.been.called();
            resolve();
          }, 100);
        });
      });
    });
  });
  describe('#subscribeTo', function() {
    beforeEach(function() {
      return userClient.__subscribeTo = chai.spy();
    });
    it('should disallow duplicates', function() {
      userClient.subscribeTo('foo');
      userClient.subscribeTo('foo');
      return expect(userClient.__subscribeTo).to.have.been.called.once;
    });
    it('should store subscriptions', function() {
      userClient.subscribeTo('foo');
      return expect(userClient.subscriptions).to.include({
        foo: true
      });
    });
    it('should send the subscription', function() {
      userClient.subscribeTo('foo');
      return expect(userClient.__subscribeTo).to.have.been.called.with('foo');
    });
  });
  describe('#unsubscribeFrom', function() {
    it('should disallow non-subscribed channels', function() {
      userClient.unsubscribeFrom('foo');
      return expect(MockPrimus.write).to.not.have.been.called();
    });
    it('should remove subscriptions', function() {
      userClient.subscriptions.foo = true;
      userClient.unsubscribeFrom('foo');
      return expect(userClient.subscriptions).to.not.include({
        foo: true
      });
    });
    it('should send the unsubscribe', function() {
      userClient.subscriptions.foo = true;
      userClient.unsubscribeFrom('foo');
      return expect(MockPrimus.write).to.have.been.called.once.with({
        action: 'Unsubscribe',
        params: {
          channel: 'foo'
        }
      });
    });
  });
  describe('#on', function() {
    it('should add the event', function() {
      var fn;
      fn = function() {};
      userClient.on('foo', fn);
      return expect(userClient.events.foo).to.include(fn);
    });
  });
  describe('#off', function() {
    beforeEach(function() {
      return setupEvents();
    });
    describe('with a callback', function() {
      it('should remove the callback', function() {
        userClient.off('event1', callback1);
        return expect(userClient.events.event1).to.eql([callback2]);
      });
      it('should not change other events', function() {
        userClient.off('event2', callback2);
        return expect(userClient.events.event1).to.eql([callback1, callback2]);
      });
    });
    describe('without a callback', function() {
      it('should remove the event', function() {
        userClient.off('event1');
        return expect(userClient.events.event1).to.eql(void 0);
      });
      it('should not change other events', function() {
        userClient.off('event2');
        return expect(userClient.events.event1).to.eql([callback1, callback2]);
      });
    });
  });
  describe('#emit', function() {
    beforeEach(function() {
      return setupEvents();
    });
    it('should call listeners', function() {
      userClient.emit({
        type: 'event1',
        works: true
      });
      expect(callback1).to.have.been.called.once.with({
        type: 'event1',
        works: true
      });
      return expect(callback2).to.have.been.called.once.with({
        type: 'event1',
        works: true
      });
    });
    it('should not call other listeners', function() {
      userClient.emit({
        type: 'event2',
        works: true
      });
      return expect(callback1).to.not.have.been.called();
    });
  });
  describe('#__subscribeToChannels', function() {
    beforeEach(function() {
      userClient.subscriptions = {
        foo: true,
        bar: true
      };
      userClient.__subscribeTo = chai.spy();
      return userClient.__subscribeToChannels();
    });
    it('should trigger all subscriptions', function() {
      expect(userClient.__subscribeTo).to.have.been.called.with('foo');
      return expect(userClient.__subscribeTo).to.have.been.called.with('bar');
    });
  });
  describe('#__subscribeTo', function() {
    it('should send the subscription', function() {
      userClient.__subscribeTo('foo');
      return expect(MockPrimus.write).to.have.been.called.once.with({
        action: 'Subscribe',
        params: {
          channel: 'foo'
        }
      });
    });
  });
  describe('#createEvent', function() {
    return it('should send the event', function() {
      userClient.createEvent('type', 'channel', {
        works: true
      });
      return expect(MockPrimus.write).to.have.been.called.with({
        action: 'Event',
        params: {
          type: 'type',
          channel: 'channel',
          data: {
            works: true
          }
        }
      });
    });
  });
});
