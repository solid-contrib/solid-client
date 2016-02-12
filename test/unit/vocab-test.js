'use strict'

var test = require('tape')
var Vocab = require('../../lib/vocab')

test('Solid.Vocab test', function (t) {
  t.plan(1)
  t.ok(Vocab.LDP.Resource, 'Vocab.LDP.Resource should exist')
})
