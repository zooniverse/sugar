nock = require 'nock'

class PanoptesServer
  @mock: ({ persist } = { persist: false }) ->
    PanoptesServer.mockInvalidAuth { persist }
    PanoptesServer.mockValidAuth { persist }
  
  # Panoptes.authenticator 1, 'invalid_auth'
  @mockInvalidAuth: ({ persist } = { persist: false }) ->
    mocked = nock(process.env.PANOPTES_HOST, reqheaders:
      'Content-Type': 'application/json'
      'Accept': 'application/vnd.api+json; version=1'
      'Authorization': 'Bearer invalid_auth'
    )
    mocked = mocked.persist() if persist
    mocked.get '/api/me'
    .reply 401, ' ',
      'www-authenticate': 'Bearer realm="Panoptes", error="invalid_token", error_description="The access token is invalid"'
      'content-type': 'text/html'
  
  # Panoptes.authenticator 1, 'valid_auth'
  @mockValidAuth: ({ persist } = { persist: false }) ->
    mocked = nock(process.env.PANOPTES_HOST, reqheaders:
      'Content-Type': 'application/json'
      'Accept': 'application/vnd.api+json; version=1'
      'Authorization': 'Bearer valid_auth'
    )
    mocked = mocked.persist() if persist
    mocked.get '/api/me'
    .reply 200, '{"users":[{"id":1,"login":"user1"}]}',
      'content-type': 'application/vnd.api+json; version=1; charset=utf-8'

module.exports = PanoptesServer
