PostgresClient = require './postgres_client'

class Notifications
  constructor: ->
    @pg = new PostgresClient()
    setInterval @clearExpired, 60 * 60 * 1000 # Clear expired once per hour
  
  close: =>
    @pg.close()
  
  create: (notification) =>
    notification.created_at or= @pg.now()
    notification.expires_at or= @pg.fromNow 60, 'day'
    
    @pg.insert notification
      .into 'notifications'
      .returning '*'
      .then (result) -> result[0]
  
  get: (opts) =>
    selector = { user_key: opts.spark.userKey }
    selector.is_delivered = false if opts.unread
    return @pg.emptySet() unless selector.user_key
    
    @pg.select '*'
      .from 'notifications'
      .where selector
      .where 'expires_at', '>', @pg.now()
      .where 'created_at', '<', opts.offset or @pg.now()
      .orderBy 'created_at', 'desc'
      .limit opts.limit or 20
  
  markRead: (ids) =>
    return if not ids or ids.length is 0
    @pg 'notifications'
      .whereIn 'id', ids
      .update 'is_delivered', true
      .exec()
  
  clearExpired: =>
    @pg 'notifications'
      .where 'expires_at', '<', @pg.now()
      .del()
      .exec()

module.exports = Notifications
