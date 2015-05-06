class SugarClient
  constructor: (@userId, @authToken) ->
    @events = { }
    @subscriptions = { }
    @initializePrimus()
  
  initializePrimus: ->
    primusKlass = if typeof Primus isnt 'undefined' then Primus else SugarClient::Primus
    @primus = primusKlass.connect undefined,
      websockets: true
      network: true
      manual: true
      ping: 10000
    
    @primus.on 'outgoing::url', @primusUrl
    @primus.on 'data', @receiveData
  
  primusUrl: (baseUrl) =>
    if @userId and @authToken
      baseUrl.query = "user_id=#{ @userId }&auth_token=#{ @authToken }"
  
  connect: =>
    @disconnect()
    @primus.open()
  
  disconnect: =>
    userKeys = (key for key, _ of @subscriptions when key.match /^(session|user):/i)
    delete @subscriptions[key] for key in userKeys
    @userKey = @loggedIn = null
    @primus.end()
  
  receiveData: (data) =>
    if data.type is 'connection'
      console?.info? '[CONNECTED] ', data
      @loggedIn = data.loggedIn
      @userKey = data.userKey
      @subscriptions[@userKey] = true
      @__subscribeToChannels()
    else
      @emit data
  
  subscribeTo: (channel) =>
    return false if @subscriptions[channel]
    @subscriptions[channel] = true
    @__subscribeTo channel
  
  unsubscribeFrom: (channel) =>
    return unless @subscriptions[channel]
    delete @subscriptions[channel]
    @primus.write action: 'Unsubscribe', params: { channel }
  
  on: (type, callback) =>
    @events[type] or= []
    @events[type].push callback
  
  off: (type, callback) =>
    if callback and @events[type]
      @events[type] = @events[type].filter (cb) -> cb isnt callback
    else
      delete @events[type]
  
  emit: (data) =>
    callbacks = @events[data.type] or []
    callback(data) for callback in callbacks
  
  __subscribeToChannels: =>
    @__subscribeTo(channel) for channel, _ of @subscriptions
  
  __subscribeTo: (channel) =>
    @primus.write action: 'Subscribe', params: { channel }
  
  createEvent: (type, channel, data) =>
    @primus.write
      action: 'Event'
      params: { type, channel, data }

module?.exports = SugarClient
