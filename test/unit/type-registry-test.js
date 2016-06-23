'use strict'

var test = require('tape')
var typeRegistry = require('../../lib/type-registry')
var parseGraph = require('../../lib/util/graph-util').parseGraph
var SolidProfile = require('../../lib/solid/profile')
var vocab = require('../../lib/vocab')
// var rdf = require('../../lib/util/rdf-parser').rdflib

var rawProfileSource = require('../resources/profile-extended')
var sampleProfileUrl = 'https://localhost:8443/profile/card'
var parsedProfileGraph = parseGraph(sampleProfileUrl,
  rawProfileSource, 'text/turtle')

test('blankPrivateTypeIndex() test', function (t) {
  let blankIndex = typeRegistry.blankPrivateTypeIndex()
  t.equal(blankIndex.slug, 'privateTypeIndex.ttl')
  t.notOk(blankIndex.uri)
  t.equal(typeof blankIndex.data, 'string')
  t.ok(blankIndex.graph)
  t.end()
})

test('blankPublicTypeIndex() test', function (t) {
  let blankIndex = typeRegistry.blankPublicTypeIndex()
  t.equal(blankIndex.slug, 'publicTypeIndex.ttl')
  t.notOk(blankIndex.uri)
  t.equal(typeof blankIndex.data, 'string')
  t.ok(blankIndex.graph)
  t.end()
})

test('Solid.typeRegistry isListedTypeIndex test', function (t) {
  var url = 'https://localhost:8443/settings/publicTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-listed')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle')
  var result = typeRegistry.isListedTypeIndex(graph)
  t.ok(result)
  t.end()
})

test('Solid.typeRegistry isUnlistedTypeIndex test', function (t) {
  var url = 'https://localhost:8443/settings/privateTypeIndex.ttl'
  var rawIndexSource = require('../resources/type-index-unlisted')
  var graph = parseGraph(url, rawIndexSource, 'text/turtle')
  var result = typeRegistry.isUnlistedTypeIndex(graph)
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
  let rawIndexSourceListed = require('../resources/type-index-listed')
  let graphListedIndex = parseGraph(urlListed, rawIndexSourceListed,
      'text/turtle')

  let urlUnlisted = 'https://localhost:8443/settings/privateTypeIndex.ttl'
  let rawIndexSourceUnlisted = require('../resources/type-index-unlisted')
  let graphUnlistedIndex = parseGraph(urlUnlisted, rawIndexSourceUnlisted,
    'text/turtle')
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)

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
