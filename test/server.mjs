import jwt from 'jsonwebtoken';
import URL from 'url';
import SugarServer from './support/sugar_server.js';

describe('Server', function() {
  var client, sugar;
  sugar = null;
  client = null;
  beforeEach(function() {
    const data = {
      id: 1,
      dname: 'user1'
    };
    jwt.verify = chai.spy(() => {
      return { data }
    });
    return SugarServer.create().then(function(server) {
      return sugar = server;
    });
  });
  afterEach(function() {
    SugarServer.closeAll();
    return client != null ? client.end() : void 0;
  });
  describe('connecting', function() {
    it('should authenticate logged in users', function() {
      client = sugar.createClient('user_id=1&auth_token=valid_auth');
      return client.once('connected', function(connection) {
        expect(connection.type).to.equal('connection');
        expect(connection.loggedIn).to.be.true;
        return expect(connection.userKey).to.equal('user:1');
      });
    });
    it('should continue existing sessions', function() {
      client = sugar.createClient('user_id=null&auth_token=null');
      return client.once('connected', function(connection) {
        expect(connection.type).to.equal('connection');
        expect(connection.loggedIn).to.be.false;
        return expect(connection.userKey).to.match(/^session:/);
      });
    });
    return describe('heartbeat', function() {
      it('should keep the connection active', function() {
        client = sugar.createClient('user_id=1&auth_token=valid_auth');
        return client.pong().then(function() {
          return expect(client.keepAliveTimer).to.change.when(client.pong);
        });
      });
      return it('should mark the user as active', function() {
        client = sugar.createClient('user_id=1&auth_token=valid_auth');
        sugar.presence.userActiveOn = chai.spy(sugar.presence.userActiveOn);
        return client.once('connected', function() {
          return client.subscribeTo('zooniverse').then(function() {
            return client.pong().then(function() {
              return expect(sugar.presence.userActiveOn).to.have.been.called.with('zooniverse', 'user:1').at.least.once;
            });
          });
        });
      });
    });
  });
  return describe('disconnecting', function() {
    it('should clear the keepAliveTimer', function() {
      client = sugar.createClient();
      return client.spark().then(function(spark) {
        return client.pong().then(function() {
          expect(spark.keepAliveTimer).to.not.eql(null);
          spark.end();
          return expect(spark.keepAliveTimer).to.eql(null);
        });
      });
    });
    it('should unsubscribe from all channels', function() {
      client = sugar.createClient('user_id=1&auth_token=valid_auth');
      return client.once('connected', function() {
        var channel;
        sugar.pubSub.unsubscribe = chai.spy(sugar.pubSub.unsubscribe);
        client.on('end', function() {
          return expect(sugar.pubSub.unsubscribe).to.have.been.called(3).times;
        });
        const ref = ['foo', 'bar', 'baz'];
        return Promise.all(ref.map(channel => client.subscribeTo(channel)))
        .then(function() {
          return client.spark().then(function(spark) {
            return spark.end();
          });
        });
      });
    });
    return it('should mark the user as inactive', function() {
      client = sugar.createClient('user_id=1&auth_token=valid_auth');
      return client.once('connected', function() {
        sugar.presence.userActiveOn = chai.spy(sugar.presence.userActiveOn);
        client.on('end', function() {
          return expect(sugar.presence.userActiveOn).to.have.been.called.once.with('projects:testing', 'user:1');
        });
        return client.subscribeTo('projects:testing').then(function() {
          return client.end();
        });
      });
    });
  });
});
