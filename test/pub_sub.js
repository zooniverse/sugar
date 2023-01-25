var PubSub, chai, expect, pubSub;

chai = require('chai');

expect = chai.expect;

PubSub = require('../lib/pub_sub');

pubSub = new PubSub();

describe('PubSub', function() {
  var subscribeTo, thennableSpy;
  beforeEach(function() {
    return pubSub = new PubSub();
  });
  subscribeTo = function(channel) {
    var callback;
    callback = chai.spy();
    return pubSub.subscribe(channel, callback).then(function() {
      return callback;
    });
  };
  thennableSpy = function() {
    return new Promise(function (resolve, reject) {
      process.nextTick(function() {
        resolve();
      });
    });
  };
  describe('#subscribe', function() {
    it('should subscribe to a pubsub channel', function() {
      pubSub.redis.sub.subscribe = chai.spy(thennableSpy);
      return subscribeTo('test').then(function() {
        const subscriber = pubSub.subscribers.test;
        expect(subscriber).to.exist;
      });
    });
    it('should subscribe to a pubsub pattern', function() {
      pubSub.redis.sub.pSubscribe = chai.spy(thennableSpy);
      return subscribeTo('test:*').then(function() {
        const subscriber = pubSub.subscribers['test:*'];
        expect(subscriber).to.exist;
      });
    });
    it('should add a listener to a single channel', function() {
      var fn;
      pubSub.emitter.on = chai.spy(thennableSpy);
      fn = function() {};
      return pubSub.subscribe('test', fn).then(function() {
        expect(pubSub.emitter.on).to.have.been.called.once.with('test', fn);
      });
    });
    return it('should add a listener to a pattern', function() {
      var fn;
      pubSub.emitter.on = chai.spy(thennableSpy);
      fn = function() {};
      return pubSub.subscribe('test:*', fn).then(function() {
        expect(pubSub.emitter.on).to.have.been.called.once.with('test:*', fn);
      });
    });
  });
  describe('#unsubscribe', function() {
    it('should unsubscribe from a pubsub channel', function() {
      return subscribeTo('test').then(function(fn) {
        const subscriber = pubSub.subscribers.test;
        subscriber.unsubscribe = chai.spy(thennableSpy);
        pubSub.unsubscribe('test', fn);
        expect(subscriber.unsubscribe).to.have.been.called.once.with('test');
      });
    });
    it('should unsubscribe from a pubsub pattern', function() {
      return subscribeTo('test:*').then(function(fn) {
        const subscriber = pubSub.subscribers['test:*'];
        subscriber.pUnsubscribe = chai.spy(thennableSpy);
        pubSub.unsubscribe('test:*', fn);
        expect(subscriber.pUnsubscribe).to.have.been.called.once.with('test:*');
      });
    });
    it('should remove a listener from a single channel', function() {
      return subscribeTo('test').then(function(fn) {
        pubSub.emitter.removeListener = chai.spy(thennableSpy);
        pubSub.unsubscribe('test', fn);
        expect(pubSub.emitter.removeListener).to.have.been.called.once.with('test', fn);
      });
    });
    it('should remove a listener from a pattern', function() {
      return subscribeTo('test:*').then(function(fn) {
        pubSub.emitter.removeListener = chai.spy(thennableSpy);
        pubSub.unsubscribe('test:*', fn);
        expect(pubSub.emitter.removeListener).to.have.been.called.once.with('test:*', fn);
      });
    });
    return it('should only unsubscribe from redis when no subscribers remain', function() {
      return Promise.all([subscribeTo('test'), subscribeTo('test')]).then(function(callbacks) {
        const subscriber = pubSub.subscribers.test;
        var fn1, fn2;
        [fn1, fn2] = callbacks;
        subscriber.unsubscribe = chai.spy(thennableSpy);
        pubSub.unsubscribe('test', fn1);
        expect(subscriber.unsubscribe).to.not.have.been.called();
        pubSub.unsubscribe('test', fn2);
        expect(subscriber.unsubscribe).to.have.been.called();
      });
    });
  });
  describe('#publish', function() {
    return it('should publish a messsage to a channel', function() {
      pubSub.redis.pub.publish = chai.spy(thennableSpy);
      return pubSub.publish('test', {
        works: true
      }).then(function() {
        return expect(pubSub.redis.pub.publish).to.have.been.called.once.with('test', '{"works":true}');
      });
    });
  });
  return describe('#emitMessage', function() {
    return it('should proxy a redis event to listeners', function() {
      var fn;
      fn = chai.spy();
      return pubSub.subscribe('test', fn).then(function() {
        return pubSub.publish('test', {
          works: true
        }).then(function() {
          return new Promise(function (resolve, reject) {
            setTimeout(function() {
              expect(fn).to.have.been.called.once.with({
                works: true
              });
              resolve();
            }, 100);
          });
        });
      });
    });
  });
});
