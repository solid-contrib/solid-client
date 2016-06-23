'use strict'

var appRegistry = require('../../lib/app-registry')
var parseGraph = require('../../lib/util/graph-util').parseGraph
var registry = require('../../lib/registry')
var test = require('tape')
// var vocab = require('../../lib/vocab')

test('blankPublicAppRegistry() test', function (t) {
  let blankRegistry = appRegistry.blankPublicAppRegistry()
  t.equal(blankRegistry.slug, 'publicAppRegistry.ttl')
  t.notOk(blankRegistry.uri)
  t.equal(typeof blankRegistry.data, 'string')
  t.ok(blankRegistry.graph)
  t.end()
})

test('blankPrivateAppRegistry() test', function (t) {
  let blankRegistry = appRegistry.blankPrivateAppRegistry()
  t.equal(blankRegistry.slug, 'privateAppRegistry.ttl')
  t.notOk(blankRegistry.uri)
  t.equal(typeof blankRegistry.data, 'string')
  t.ok(blankRegistry.graph)
  t.end()
})

test('appRegistry isListed() test', function (t) {
  var url = 'https://localhost:8443/profile/publicAppRegistry.ttl'
  var rawSource = require('../resources/app-registry-listed')
  var graph = parseGraph(url, rawSource, 'text/turtle')
  var result = registry.isListed(graph)
  t.ok(result)
  t.end()
})

test('appRegistry isUnlisted() test', function (t) {
  var url = 'https://localhost:8443/profile/privateAppRegistry.ttl'
  var rawSource = require('../resources/app-registry-unlisted')
  var graph = parseGraph(url, rawSource, 'text/turtle')
  var result = registry.isUnlisted(graph)
  t.ok(result)
  t.end()
})
