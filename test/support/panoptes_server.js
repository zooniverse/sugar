const { MockAgent, setGlobalDispatcher } = require('undici');
const mockAgent = new MockAgent();
const mockPool = mockAgent.get(process.env.PANOPTES_HOST);
setGlobalDispatcher(mockAgent);

class PanoptesServer {
  static mock() {
    PanoptesServer.mockInvalidAuth();
    PanoptesServer.mockValidAuth();
  }

  
    // Panoptes.authenticator 1, 'invalid_auth'
  static mockInvalidAuth() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.api+json; version=1',
      'Authorization': `Bearer invalid_auth`
    };
    return mockPool.intercept({ path: '/api/me', headers }).reply(401, ' ', {
      'www-authenticate': 'Bearer realm="Panoptes", error="invalid_token", error_description="The access token is invalid"',
      'content-type': 'text/html'
    });
  }

  
    // Panoptes.authenticator 1, 'valid_auth'
  static mockValidAuth() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.api+json; version=1',
      'Authorization': `Bearer valid_auth`
    };
    return mockPool.intercept({ path: '/api/me', headers }).reply(200, '{"users":[{"id":1,"display_name":"user1"}]}', {
      'content-type': 'application/vnd.api+json; version=1; charset=utf-8'
    });
  }
};

module.exports = PanoptesServer;
