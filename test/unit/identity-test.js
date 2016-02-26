'use strict'

var test = require('tape')
var Solid = require('../../index')
var parseGraph = require('../../lib/util/graph-util').parseGraph

test('Solid.identity isPublicTypeIndex text', function (t) {
  var url = 'https://localhost:8443/settings/publicTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-public')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle')
  var result = Solid.identity.isPublicTypeIndex(graph)
  t.ok(result)
  t.end()
})

test('Solid.identity isPrivateTypeIndex text', function (t) {
  var url = 'https://localhost:8443/settings/privateTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-private')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle')
  var result = Solid.identity.isPrivateTypeIndex(graph)
  t.ok(result)
  t.end()
})
