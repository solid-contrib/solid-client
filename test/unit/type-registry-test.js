'use strict'

const registry = require('../../src/registry')
const test = require('tape')
const nock = require('nock')
const identity = require('../../src/identity')
const typeRegistry = require('../../src/type-registry')
const parseGraph = require('../../src/util/graph-util').parseGraph
const SolidProfile = require('../../src/solid/profile')
const rdf = require('../../src/util/rdf-parser')
const vocab = require('solid-namespace')(rdf)
const webClient = require('solid-web-client')(rdf)

const rawProfileSource = require('../resources/profile-extended')
const rawPrivateProfileSource = require('../resources/profile-private')
const rawIndexSourceListed = require('../resources/type-index-listed')
const rawIndexSourceUnlisted = require('../resources/type-index-unlisted')
const sampleProfileUrl = 'https://localhost:8443/profile/card'
const parsedProfileGraph = parseGraph(sampleProfileUrl,
  rawProfileSource, 'text/turtle', rdf)

test('blankPrivateTypeIndex() test', function (t) {
  let blankIndex = typeRegistry.blankPrivateTypeIndex(rdf)
  t.equal(blankIndex.slug, 'privateTypeIndex.ttl')
  t.notOk(blankIndex.uri)
  t.equal(typeof blankIndex.data, 'string')
  t.ok(blankIndex.graph)
  t.end()
})

test('blankPublicTypeIndex() test', function (t) {
  let blankIndex = typeRegistry.blankPublicTypeIndex(rdf)
  t.equal(blankIndex.slug, 'publicTypeIndex.ttl')
  t.notOk(blankIndex.uri)
  t.equal(typeof blankIndex.data, 'string')
  t.ok(blankIndex.graph)
  t.end()
})

test('typeRegistry isListed() test', function (t) {
  var url = 'https://localhost:8443/profile/publicTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-listed')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle', rdf)
  var result = registry.isListed(graph, rdf)
  t.ok(result)
  t.end()
})

test('typeRegistry isUnlisted() test', function (t) {
  var url = 'https://localhost:8443/profile/privateTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-unlisted')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle', rdf)
  var result = registry.isUnlisted(graph, rdf)
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

test('SolidProfile addTypeRegistry() test', function (t) {
  let urlListed = 'https://localhost:8443/settings/publicTypeIndex.ttl'
  let graphListedIndex = parseGraph(urlListed, rawIndexSourceListed,
      'text/turtle', rdf)

  let urlUnlisted = 'https://localhost:8443/settings/privateTypeIndex.ttl'
  let graphUnlistedIndex = parseGraph(urlUnlisted, rawIndexSourceUnlisted,
    'text/turtle', rdf)
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)

  profile.addTypeRegistry(graphListedIndex, urlListed)
  profile.addTypeRegistry(graphUnlistedIndex, urlUnlisted)
  profile.isLoaded = true

  // Look up the address book (loaded from public registry)
  var result =
    profile.typeRegistryForClass(vocab.vcard('AddressBook'))
  t.equal(result.length, 1)  // one listed registry match
  var registration = result[0]
  t.ok(registration.registrationUri)
  t.equal(registration.rdfClass.uri, vocab.vcard('AddressBook').uri)
  t.equal(registration.locationType, 'instance')
  t.equal(registration.locationUri,
    'https://localhost:8443/contacts/addressBook.ttl')
  t.ok(registration.isListed)

  // Look up the SIOC posts (loaded from the unlisted registry)
  result =
    profile.typeRegistryForClass(vocab.sioc('Post'))
  t.equal(result.length, 1)  // one unlisted registry match
  registration = result[0]
  t.ok(registration.registrationUri)
  t.equal(registration.rdfClass.uri, vocab.sioc('Post').uri)
  t.equal(registration.locationType, 'container')
  t.equal(registration.locationUri,
    'https://localhost:8443/posts/')
  t.notOk(registration.isListed)

  // var classToRegister = vocab.vcard('Contact')
  // var location = 'https://localhost:8443/contacts/'
  // var locationType = 'container'
  // profile.registerType(classToRegister, location, locationType)

  t.end()
})

test('type registry addToTypeIndex() updates the profile with new registry when there was previously nothing in the type index', t => {
  nock('https://localhost:8443/')
    .patch('/settings/publicTypeIndex.ttl')
    .reply(200)

  const profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
  const rdfClass = vocab.vcard('Contact')
  const location = 'https://example.com/Contacts'
  const locationType = 'instance'
  const isListed = true

  typeRegistry.addToTypeIndex(profile, rdfClass, location, webClient, locationType, isListed)
    .then(updatedProfile => {
      const graph = profile.typeIndexListed.graph
      const subj = graph.any(null, vocab.rdf('type'), vocab.solid('TypeRegistration')).subject
      t.ok(graph.any(subj, vocab.rdf('type'), vocab.solid('TypeRegistration')))
      t.ok(graph.any(subj, vocab.solid('forClass'), rdfClass))
      t.ok(graph.any(subj, vocab.solid('instance'), rdf.namedNode(location)))
      t.end()
    })
})

test('loadTypeRegistry loads all the type registrations', t => {
  const headers = { 'Content-Type': 'text/turtle' }
  nock('https://localhost:8443/')
    .get('/profile/card')
    .reply(200, rawProfileSource, headers)
    .get('/settings/privateProfile1.ttl')
    .reply(200, rawPrivateProfileSource, headers)
    .get('/settings/publicTypeIndex.ttl')
    .reply(200, rawIndexSourceListed, headers)
    .get('/settings/privateTypeIndex.ttl')
    .reply(200, rawIndexSourceUnlisted, headers)

  identity.getProfile('https://localhost:8443/profile/card#me', {}, webClient, rdf)
    .then(solidProfile => typeRegistry.loadTypeRegistry(solidProfile, webClient))
    .then(solidProfile => {
      t.ok(solidProfile.typeIndexListed.graph.any(null, vocab.rdf('type'), vocab.solid('TypeRegistration')))
      t.ok(solidProfile.typeIndexUnlisted.graph.any(null, vocab.rdf('type'), vocab.solid('TypeRegistration')))
      t.end()
    })
})

test('loadTypeRegistry succeeds when at least one type index succeeds in loading', t => {
  const headers = { 'Content-Type': 'text/turtle' }
  nock('https://localhost:8443/')
    .get('/profile/card')
    .reply(200, rawProfileSource, headers)
    .get('/settings/privateProfile1.ttl')
    .reply(200, rawPrivateProfileSource, headers)
    .get('/settings/publicTypeIndex.ttl')
    .reply(200, rawIndexSourceListed, headers)
    .get('/settings/privateTypeIndex.ttl')
    .reply(500)

  identity.getProfile('https://localhost:8443/profile/card#me', {}, webClient, rdf)
    .then(solidProfile => typeRegistry.loadTypeRegistry(solidProfile, webClient))
    .then(solidProfile => {
      t.ok(solidProfile.typeIndexListed.graph.any(null, vocab.rdf('type'), vocab.solid('TypeRegistration')))
      t.notOk(solidProfile.typeIndexUnlisted.graph)
      t.end()
    })
})

test('loadTypeRegistry fails when all of the type indices fail to load', t => {
  const headers = { 'Content-Type': 'text/turtle' }
  nock('https://localhost:8443/')
    .get('/profile/card')
    .reply(200, rawProfileSource, headers)
    .get('/settings/privateProfile1.ttl')
    .reply(200, rawPrivateProfileSource, headers)
    .get('/settings/publicTypeIndex.ttl')
    .reply(500)
    .get('/settings/privateTypeIndex.ttl')
    .reply(500)

  identity.getProfile('https://localhost:8443/profile/card#me', {}, webClient, rdf)
    .then(solidProfile => typeRegistry.loadTypeRegistry(solidProfile, webClient))
    .catch(error => {
      t.equal(error.message, 'Could not load any type index')
      t.end()
    })
})
