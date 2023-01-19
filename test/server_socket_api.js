var SugarServer, chai, expect;

chai = require('chai');

expect = chai.expect;

SugarServer = require('./support/sugar_server');

describe('Server Socket API', function() {
  var client, sugar;
  sugar = null;
  client = null;
  beforeEach(function() {
    return SugarServer.create().then(function(server) {
      sugar = server;
      client = sugar.createClient('user_id=1&auth_token=valid_auth');
      return new Promise(function (resolve, reject) {
        client.once('connected', resolve);
      });
    });
  });
  afterEach(function() {
    SugarServer.closeAll();
    return client.end();
  });
  describe('#clientSubscribe', function() {
    it('should subscribe to the channel', function() {
      sugar.pubSub.subscribe = chai.spy(sugar.pubSub.subscribe);
      return client.subscribeTo('test').then(function() {
        return expect(sugar.pubSub.subscribe).to.have.been.called.once.with('test');
      });
    });
    it('should permit the subscription to the user channel', function() {
      sugar.pubSub.subscribe = chai.spy(sugar.pubSub.subscribe);
      return client.subscribeTo('user:1').then(function() {
        return expect(sugar.pubSub.subscribe).to.have.been.called.once.with('user:1');
      });
    });
    it('should permit the subscription to the session channel', function() {
      client = sugar.createClient();
      return client.once('connected', function() {
        var sessionKey;
        sessionKey = client.connection.userKey;
        sugar.pubSub.subscribe = chai.spy(sugar.pubSub.subscribe);
        return client.subscribeTo(sessionKey).then(function() {
          return expect(sugar.pubSub.subscribe).to.have.been.called.once.with(sessionKey);
        });
      });
    });
    it('should not permit the subscription to other user channels', function() {
      sugar.pubSub.subscribe = chai.spy(sugar.pubSub.subscribe);
      client.subscribeTo('user:2');
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          expect(sugar.pubSub.subscribe).to.not.have.been.called();
          resolve();
        }, 50);
      });
    });
    it('should not permit the subscription to other session channels', function() {
      sugar.pubSub.subscribe = chai.spy(sugar.pubSub.subscribe);
      client = sugar.createClient();
      return client.once('connected', function() {
        client.subscribeTo('session:somebody-else');
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            expect(sugar.pubSub.subscribe).to.not.have.been.called();
            resolve();
          }, 50);
        });
      });
    });
    it('should store the subscription on the connection', function() {
      return client.subscribeTo('test').then(function() {
        return client.spark().then(function(spark) {
          var subscription;
          subscription = spark.subscriptions['test'];
          expect(subscription).to.be.a('function');
          return expect(subscription.channel).to.equal('test');
        });
      });
    });
    return it('should mark the user as active on the channel', function() {
      sugar.presence.userActiveOn = chai.spy(sugar.presence.userActiveOn);
      return client.subscribeTo('test').then(function() {
        return expect(sugar.presence.userActiveOn).to.have.been.called.once.with('test', 'user:1');
      });
    });
  });
  describe('#clientUnsubscribe', function() {
    it('should unsubscribe from the channel', function() {
      sugar.pubSub.unsubscribe = chai.spy(sugar.pubSub.unsubscribe);
      return client.subscribeTo('test').then(function() {
        return client.spark().then(function(spark) {
          var callback;
          callback = spark.subscriptions.test;
          return client.unsubscribeFrom('test').then(function() {
            return expect(sugar.pubSub.unsubscribe).to.have.been.called.once.with('test', callback);
          });
        });
      });
    });
    it('should remove the subscription from the connection', function() {
      return client.subscribeTo('test').then(function() {
        return client.spark().then(function(spark) {
          return client.unsubscribeFrom('test').then(function() {
            var subscription;
            subscription = spark.subscriptions['test'];
            return expect(subscription).to.eql(void 0);
          });
        });
      });
    });
    return it('should mark the user as inactive on the channel', function() {
      sugar.presence.userInactiveOn = chai.spy(sugar.presence.userInactiveOn);
      return client.subscribeTo('test').then(function() {
        return client.unsubscribeFrom('test').then(function() {
          return expect(sugar.presence.userInactiveOn).to.have.been.called.once.with('test', 'user:1');
        });
      });
    });
  });
  return describe('#clientEvent', function() {
    return it('should proxy client generated events to redis', function() {
      sugar.pubSub.publish = chai.spy(sugar.pubSub.publish);
      return client.sendEvent({
        channel: 'test',
        type: 'testing'
      }).then(function() {
        return expect(sugar.pubSub.publish).to.have.been.called.once;
      });
    });
  });
});
