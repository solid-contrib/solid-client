'use strict'

var test = require('tape')
var typeRegistry = require('../../lib/type-registry')
var parseGraph = require('../../lib/util/graph-util').parseGraph
var SolidProfile = require('../../lib/solid/profile')
var vocab = require('../../lib/vocab')
// var rdf = require('../../lib/util/rdf-parser').rdflib

var rawProfileSource = require('../resources/profile-ldnode')
var sampleProfileUrl = 'https://localhost:8443/profile/card'
var parsedProfileGraph = parseGraph(sampleProfileUrl,
  rawProfileSource, 'text/turtle')

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

test('SolidProfile addTypeRegistry() test', function (t) {
  let urlPub = 'https://localhost:8443/settings/publicTypeIndex.ttl'
  let rawIndexSourcePub = require('../resources/type-index-public')
  let graphPubIndex = parseGraph(urlPub, rawIndexSourcePub, 'text/turtle')

  let urlPri = 'https://localhost:8443/settings/privateTypeIndex.ttl'
  let rawIndexSourcePri = require('../resources/type-index-private')
  let graphPriIndex = parseGraph(urlPri, rawIndexSourcePri, 'text/turtle')

  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)

  profile.addTypeRegistry(graphPubIndex)
  profile.addTypeRegistry(graphPriIndex)

  // Look up the address book (loaded from public registry)
  var result =
    profile.typeRegistryForClass(vocab.vcard('AddressBook'))
  console.log(result.public[0].toNT())
  t.deepEqual(result.private, [])  // no private registry matches
  t.equal(result.public.length, 1)  // one public registry match

  // Look up the SIOC posts (loaded from private registry)
  result =
    profile.typeRegistryForClass(vocab.sioc('Post'))
  t.deepEqual(result.public, [])  // no public registry matches
  t.equal(result.private.length, 1)  // one public registry match
  t.end()
})
