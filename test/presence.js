var Presence, chai, expect, presence;

chai = require('chai');

expect = chai.expect;

Presence = require('../lib/presence');

presence = new Presence();

describe('Presence', function() {
  var active, activeOn, createSamples, inactive;
  beforeEach(function() {
    return presence = new Presence();
  });
  active = function(user, channel) {
    return presence.userActiveOn(channel, user);
  };
  inactive = function(user, channel) {
    return presence.userInactiveOn(channel, user);
  };
  activeOn = function(channel) {
    return presence.redis.zrangebyscoreAsync(`presence:${channel}`, '-inf', '+inf', 'withscores').then(function(list) {
      var i, j, key, len, users;
      users = {};
      for (i = j = 0, len = list.length; j < len; i = j += 2) {
        key = list[i];
        users[key] = +list[i + 1];
      }
      return users;
    });
  };
  createSamples = function() {
    return Promise.all([active('user:1', 'test1'), active('user:1', 'zooniverse'), active('user:2', 'test2'), active('user:2', 'zooniverse'), active('session:3', 'test3'), active('session:3', 'zooniverse')]);
  };
  describe('#userActiveOn', function() {
    it('should set a user as active on a channel', function() {
      return active('user:123', 'zooniverse').then(function() {
        return activeOn('zooniverse').then(function(users) {
          var now;
          now = +new Date();
          return expect(users['user:123']).to.be.within(now - 1000, now + 1000);
        });
      });
    });
    it('should reject user channels', function() {
      return active('user:123', 'user:123').then(function() {
        return presence.redis.existsAsync('presence:user:123').then(function(result) {
          return expect(result).to.equal(0);
        });
      });
    });
    return it('should reject session channels', function() {
      return active('session:123', 'session:123').then(function() {
        return presence.redis.existsAsync('presence:session:123').then(function(result) {
          return expect(result).to.equal(0);
        });
      });
    });
  });
  describe('#userInactiveOn', function() {
    it('should set a user as inactive on a channel', function() {
      return presence.redis.zaddAsync('presence:zooniverse', 123, 'user:123').then(function() {
        return inactive('user:123', 'zooniverse').then(function() {
          return activeOn('zooniverse').then(function(users) {
            return expect(users).to.not.have.property('user:123');
          });
        });
      });
    });
    it('should reject user channels', function() {
      return presence.redis.zaddAsync('presence:user:123', 123, 'user:123').then(function() {
        return inactive('user:123', 'user:123').then(function() {
          return activeOn('user:123').then(function(users) {
            return expect(users).to.have.property('user:123');
          });
        });
      });
    });
    return it('should reject session channels', function() {
      return presence.redis.zaddAsync('presence:session:123', 123, 'session:123').then(function() {
        return inactive('session:123', 'session:123').then(function() {
          return activeOn('session:123').then(function(sessions) {
            return expect(sessions).to.have.property('session:123');
          });
        });
      });
    });
  });
  describe('#clearInactive', function() {
    return it('should remove inactive users', function() {
      var oldDate;
      oldDate = +new Date() - 3 * 60 * 1000; // 3 minutes ago
      return presence.redis.zaddAsync('presence:zooniverse', oldDate, 'user:1').then(function() {
        return presence.redis.zaddAsync('presence:zooniverse', +new Date(), 'user:2').then(function() {
          return presence.clearInactive().then(function() {
            return activeOn('zooniverse').then(function(users) {
              expect(users).to.not.have.property('user:1');
              return expect(users).to.have.property('user:2');
            });
          });
        });
      });
    });
  });
  describe('#channels', function() {
    return it('should list the channels with active users', function() {
      return createSamples().then(function() {
        return presence.channels().then(function(channels) {
          return expect(channels).to.have.members(['test1', 'test2', 'test3', 'zooniverse']);
        });
      });
    });
  });
  describe('#countOn', function() {
    return it('should count the number of active users on a channel', function() {
      return createSamples().then(function() {
        return Promise.all([
          presence.countOn('zooniverse').then(function(count) {
            return expect(count).to.equal(3);
          }),
          presence.countOn('test1').then(function(count) {
            return expect(count).to.equal(1);
          }),
          presence.countOn('test2').then(function(count) {
            return expect(count).to.equal(1);
          }),
          presence.countOn('test3').then(function(count) {
            return expect(count).to.equal(1);
          })
        ]);
      });
    });
  });
  describe('#channelCounts', function() {
    return it('should list the number of active users on active channels', function() {
      return createSamples().then(function() {
        return presence.channelCounts().then(function(counts) {
          expect(counts).to.deep.include({
            channel: 'zooniverse',
            count: 3
          });
          expect(counts).to.deep.include({
            channel: 'test1',
            count: 1
          });
          expect(counts).to.deep.include({
            channel: 'test2',
            count: 1
          });
          return expect(counts).to.deep.include({
            channel: 'test3',
            count: 1
          });
        });
      });
    });
  });
  return describe('#usersOn', function() {
    it('should list the active users on a channel', function() {
      return createSamples().then(function() {
        return presence.usersOn('zooniverse').then(function(users) {
          return expect(users).to.have.members(['1', '2']);
        });
      });
    });
    return it('should not list active sessions', function() {
      return createSamples().then(function() {
        return presence.usersOn('test3').then(function(users) {
          return expect(users).to.be.empty;
        });
      });
    });
  });
});
