'use strict'

var test = require('tape')
var vocab = require('../../lib/vocab')

test('Solid.vocab test', function (t) {
  t.plan(1)
  t.ok(vocab.ldp('Resource'), 'vocab.ldp("Resource") should exist')
})
