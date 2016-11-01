'use strict'

var test = require('tape')
var solid = require('../../lib/index')

test('solid.vocab test', function (t) {
  t.plan(1)
  t.ok(solid.vocab.ldp('Resource'), 'vocab.ldp("Resource") should exist')
})
