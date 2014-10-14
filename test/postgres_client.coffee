chai = require 'chai'
expect = chai.expect

describe 'PostgresClient', ->
  it 'should return a knex client'
  
  describe '#now', ->
    it 'should return current utc time'
  
  describe '#nowInterval', ->
    it 'should return a time interval'
  
  describe '#ago', ->
    it 'should return a past time interval'
  
  describe '#fromNow', ->
    it 'should return a future time interval'
  
  describe '#emptySet', ->
    it 'should promise to return an empty set'
