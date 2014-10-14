chai = require 'chai'
expect = chai.expect
PostgresClient = require '../lib/postgres_client'
pgClient = new PostgresClient()

describe 'PostgresClient', ->
  it 'should return a knex client', ->
    expect(pgClient.name).to.equal 'knex'
  
  describe '#now', ->
    it 'should return current utc time', ->
      expect(pgClient.now().sql).to.equal "now() at time zone 'utc'"
  
  describe '#nowInterval', ->
    it 'should return a time interval', ->
      oneDayAgo = pgClient.nowInterval('-', 1, 'day').sql
      fiveMinutesFromNow = pgClient.nowInterval('+', 5, 'minute').sql
      expect(oneDayAgo).to.equal "now() at time zone 'utc' - interval '1' day"
      expect(fiveMinutesFromNow).to.equal "now() at time zone 'utc' + interval '5' minute"
  
  describe '#ago', ->
    it 'should return a past time interval', ->
      oneDayAgo = pgClient.ago(1, 'day').sql
      expect(oneDayAgo).to.equal "now() at time zone 'utc' - interval '1' day"
  
  describe '#fromNow', ->
    it 'should return a future time interval', ->
      fiveMinutesFromNow = pgClient.fromNow(5, 'minute').sql
      expect(fiveMinutesFromNow).to.equal "now() at time zone 'utc' + interval '5' minute"
  
  describe '#emptySet', ->
    it 'should promise to return an empty set', ->
      expect(pgClient.emptySet()).to.eventually.be.empty
