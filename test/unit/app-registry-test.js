'use strict'

const nock = require('nock')
const test = require('tape')

const appRegistry = require('../../src/app-registry')
const parseGraph = require('../../src/util/graph-util').parseGraph
const registry = require('../../src/registry')
const AppRegistration = require('../../src/solid/app-registration')
const SolidProfile = require('../../src/solid/profile')

const rdf = require('../../src/util/rdf-parser')
const vocab = require('solid-namespace')(rdf)
const webClient = require('solid-web-client')(rdf)

const sampleProfileUrl = 'https://localhost:8443/profile/card'
const rawProfileSource = require('../resources/profile-extended')
const parsedProfileGraph = parseGraph(
  sampleProfileUrl,
  rawProfileSource,
  'text/turtle',
  rdf
)

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

test('app registry addToAppRegistry() updates the profile with new registry when there was previously nothing in the app registry', t => {
  nock('https://localhost:8443/')
    .patch('/settings/publicAppRegistry.ttl')
    .reply(200)

  const profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
  const app = new AppRegistration(
    {
      name: 'Example App',
      shortdesc: 'An example app registration for testing',
      redirectTemplateUri: 'https://example.com/app/?uri={uri}'
    },
    [],
    true
  )

  appRegistry.addToAppRegistry(profile, app, webClient)
    .then(updatedProfile => {
      app.rdfStatements(rdf).map(st => {
        t.ok(
          updatedProfile.appRegistryListed.graph.anyStatementMatching(
            st.subject, st.predicate, st.object
          )
        )
      })
      t.end()
    })
})
