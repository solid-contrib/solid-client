'use strict'

var appRegistry = require('../../lib/app-registry')
var parseGraph = require('../../lib/util/graph-util').parseGraph
var registry = require('../../lib/registry')
var test = require('tape')
var AppRegistration = require('../../lib/solid/app-registration')

var rdf = require('../../lib/util/rdf-parser')
var vocab = require('solid-namespace')(rdf)

test('blankPublicAppRegistry() test', function (t) {
  let blankRegistry = appRegistry.blankPublicAppRegistry(rdf)
  t.equal(blankRegistry.slug, 'publicAppRegistry.ttl')
  t.notOk(blankRegistry.uri)
  t.equal(typeof blankRegistry.data, 'string')
  t.ok(blankRegistry.graph)
  t.end()
})

test('blankPrivateAppRegistry() test', function (t) {
  let blankRegistry = appRegistry.blankPrivateAppRegistry(rdf)
  t.equal(blankRegistry.slug, 'privateAppRegistry.ttl')
  t.notOk(blankRegistry.uri)
  t.equal(typeof blankRegistry.data, 'string')
  t.ok(blankRegistry.graph)
  t.end()
})

test('appRegistry isListed() test', function (t) {
  var url = 'https://localhost:8443/profile/publicAppRegistry.ttl'
  var rawSource = require('../resources/app-registry-listed')
  var graph = parseGraph(url, rawSource, 'text/turtle', rdf)
  var result = registry.isListed(graph, rdf)
  t.ok(result)
  t.end()
})

test('appRegistry isUnlisted() test', function (t) {
  var url = 'https://localhost:8443/profile/privateAppRegistry.ttl'
  var rawSource = require('../resources/app-registry-unlisted')
  var graph = parseGraph(url, rawSource, 'text/turtle', rdf)
  var result = registry.isUnlisted(graph, rdf)
  t.ok(result)
  t.end()
})

test('new app registration test', function (t) {
  let app = new AppRegistration()
  t.notOk(app.isListed, 'An app registration is unlisted by default')
  t.deepEqual(app.types, [])
  t.end()
})

test('app registration isValid() test', function (t) {
  let app = new AppRegistration()
  t.notOk(app.isValid(), 'A new/empty app registration should be not valid')
  app.name = 'Contact Manager'
  t.notOk(app.isValid())
  app.redirectTemplateUri = 'https://solid.github.io/contacts/?uri={uri}'
  t.notOk(app.isValid())
  app.types.push(vocab.vcard('AddressBook'))
  t.ok(app.isValid(),
    'A registration should be valid with a name, redirectTemplateUri, and at least one type')
  t.end()
})

test('app registrationsFromGraph test', function (t) {
  var url = 'https://localhost:8443/profile/publicAppRegistry.ttl'
  var rawSource = require('../resources/app-registry-listed')
  var graph = parseGraph(url, rawSource, 'text/turtle', rdf)
  var isListed = true
  var registrations = appRegistry.registrationsFromGraph(graph,
    vocab.vcard('AddressBook'), rdf)
  var app = registrations[0]
  t.equal(app.name, 'Contact Manager')
  t.equal(app.shortdesc, 'A reference contact manager')
  t.equal(app.redirectTemplateUri, 'https://solid.github.io/contacts/?uri={uri}')
  t.end()
})
