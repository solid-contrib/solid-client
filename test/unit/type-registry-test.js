'use strict'

var test = require('tape')
var typeRegistry = require('../../lib/type-registry')
var parseGraph = require('../../lib/util/graph-util').parseGraph
var SolidProfile = require('../../lib/solid/profile')

test('Solid.typeRegistry isPublicTypeIndex test', function (t) {
  var url = 'https://localhost:8443/settings/publicTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-public')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle')
  var result = typeRegistry.isPublicTypeIndex(graph)
  t.ok(result)
  t.end()
})

test('Solid.typeRegistry isPrivateTypeIndex test', function (t) {
  var url = 'https://localhost:8443/settings/privateTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-private')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle')
  var result = typeRegistry.isPrivateTypeIndex(graph)
  t.ok(result)
  t.end()
})

test('registerType - throws error for invalid arguments', function (t) {
  let profile = new SolidProfile()  // not loaded
  t.throws(function () {
    typeRegistry.registerType(profile)
  }, 'Registering a type without loading a profile throws an error')
  t.end()
})
