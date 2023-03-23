const chai = require('chai');

const expect = chai.expect;

const URL = require('url');

const SugarServer = require('./support/sugar_server');
const PanoptesServer = require('./support/panoptes_server');

describe('Server HTTP API', function() {
  let sugar = null;

  beforeEach(function() {
    PanoptesServer.mock();
    return SugarServer.create().then(function(server) {
      return sugar = server;
    });
  });

  afterEach(function() {
    return SugarServer.closeAll();
  });

  function post(path, body, user, pass) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
    };
    return fetch(
      `http://localhost:${sugar.port}${path}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }
    );
  };

  function get(path, params) {
    const uri = URL.parse(`http://localhost:${sugar.port}${path}`);
    uri.query = params;
    const headers = {
      'Content-Type': 'application/json'
    };
    return fetch(
      uri.format(),
      {
        method: 'GET',
        headers
      }
    );
  };

  describe('GET /presence', function() {
    it('should respond with the number of active users on each channel', async function() {
      const response = await get('/presence');
      expect(response.status).to.equal(200);
      const body = await response.json();
      expect(body).to.deep.equal([]);
    });
  });

  describe('GET /active_users', function() {
    it('should respond with the logged in users on a channel', async function() {
      const response = await get('/active_users', {
        channel: 'testing'
      });
      expect(response.status).to.equal(200);
      const body = await response.json();
      expect(body.users).to.deep.equal([]);
    });
  });

  describe('POST /notify', function() {
    it('should authorize the request', async function() {
      const response = await post('/notify', {
        notifications: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      });
      expect(response.status).to.equal(401);
    });

    it('should publish the notification', async function() {
      const response = await post('/notify', {
        notifications: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      }, 'testUser', 'testPass');
      expect(response.status).to.equal(200);
      const body = await response.json();
      expect(body).to.deep.equal([
        {
          user_id: 1,
          message: 'test',
          url: 'test',
          section: 'zooniverse',
          delivered: false,
          type: 'notification'
        }
      ]);
    });
  });

  describe('POST /announce', function() {
    it('should authorize the request', async function() {
      const response = await post('/announce', {
        announcements: [
          {
            message: 'test',
            section: 'zooniverse'
          }
        ]
      }, 'wrong', 'wrong');
      expect(response.status).to.equal(401);
    });

    it('should publish the announcement', async function() {
      const response = await post('/announce', {
        announcements: [
          {
            message: 'test',
            section: 'zooniverse'
          }
        ]
      }, 'testUser', 'testPass');
      expect(response.status).to.equal(200);
      const body = await response.json();
      expect(body).to.deep.equal([{
        message: 'test',
        section: 'zooniverse',
        type: 'announcement'
      }]);
    });
  });

  describe('POST /experiment', function() {
    it('should authorize the request', async function() {
      const response = await post('/experiment', {
        experiments: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      });
      expect(response.status).to.equal(401);
    });

    it('should publish the experiment', async function() {
      const response = await post('/experiment', {
        experiments: [
          {
            user_id: 1,
            message: 'test',
            url: 'test',
            section: 'zooniverse',
            delivered: false
          }
        ]
      }, 'testUser', 'testPass');
      expect(response.status).to.equal(200);
      const body = await response.json();
      expect(body).to.deep.equal([
        {
          user_id: 1,
          message: 'test',
          url: 'test',
          section: 'zooniverse',
          delivered: false,
          type: 'experiment'
        }
      ]);
    });
  });
});
