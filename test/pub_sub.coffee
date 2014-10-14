chai = require 'chai'
expect = chai.expect

describe 'PubSub', ->
  describe '#subscribe', ->
    it 'should listen for events on a single channel'
    it 'should listen for events on a pattern'
  
  describe '#unsubscribe', ->
    it 'should remove a listener from a single channel'
    it 'should remove a listener from a pattern'
  
  describe '#publish', ->
    it 'should publish a messsage to a channel'
  
  describe '#emitMessage', ->
    it 'should proxy a redis event to listeners'
