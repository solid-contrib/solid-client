'use strict'

var test = require('tape')
var SolidProfile = require('../../lib/solid-profile')
var parseGraph = require('../../lib/graph-util').parseGraph

var rawProfileSource = require('../resources/profile-ldnode')
var sampleProfileUrl = 'https://localhost:8443/profile/card'
var parsedProfileGraph = parseGraph(sampleProfileUrl,
  rawProfileSource, 'text/turtle')

var Vocab = require('../../lib/vocab')
var rdf = require('../../lib/rdf-parser').rdflib

test('SolidProfile empty profile test', function (t) {
  let profile = new SolidProfile()
  t.notOk(profile.webId, 'Empty profile should not have webId set')
  t.notOk(profile.response, 'Empty profile - no response object')
  t.notOk(profile.inbox(), 'Empty profile - no inbox')
  t.deepEqual(profile.preferences(), [],
    'Empty profile - no preferences')
  t.deepEqual(profile.storage(), [],
    'Empty profile - no storage')
  t.deepEqual(profile.typeIndexes(), [],
    'Empty profile - no public or private type registry indexes')
  t.deepEqual(profile.relatedProfiles.sameAs, [],
    'Empty profile - no sameAs')
  t.deepEqual(profile.relatedProfiles.seeAlso, [],
    'Empty profile - no seeAlso')
  t.end()
})

test('SolidProfile base profile url test', function (t) {
  t.plan(1)
  let profileUrl = 'https://localhost:8443/profile/card#me'
  let expectedBaseProfileUrl = 'https://localhost:8443/profile/card'
  let profile = new SolidProfile(profileUrl)
  t.equal(profile.baseProfileUrl, expectedBaseProfileUrl)
})

test('SolidProfile webId test', function (t) {
  t.plan(1)
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedWebId = 'https://localhost:8443/profile/card#me'
  t.equal(profile.webId, expectedWebId)
})

test('SolidProfile preferences list test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedPreferences = ['https://localhost:8443/settings/prefs.ttl']
  t.deepEqual(profile.preferences(), expectedPreferences)
  t.end()
})

test('SolidProfile inbox test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedInboxLink = 'https://localhost:8443/inbox/'
  t.equal(profile.inbox(), expectedInboxLink)
  t.end()
})

test('SolidProfile storage test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedStorageLinks = ['https://localhost:8443/']
  t.deepEqual(profile.storage(), expectedStorageLinks)
  t.end()
})

test('SolidProfile type registry indexes test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedLinks =
    [
      'https://localhost:8443/settings/privateTypeIndex.ttl',
      'https://localhost:8443/settings/publicTypeIndex.ttl'
    ]
  t.deepEqual(profile.typeIndexes().sort(), expectedLinks)
  t.end()
})

test('SolidProfile addTypeRegistry() test', function (t) {
  var urlPub = 'https://localhost:8443/settings/publicTypeIndex.ttl'
  var rawIndexSourcePub = require('../resources/type-index-public')
  var graphPubIndex = parseGraph(urlPub, rawIndexSourcePub, 'text/turtle')

  var urlPri = 'https://localhost:8443/settings/privateTypeIndex.ttl'
  var rawIndexSourcePri = require('../resources/type-index-private')
  var graphPriIndex = parseGraph(urlPri, rawIndexSourcePri, 'text/turtle')

  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)

  profile.addTypeRegistry(graphPubIndex)
  profile.addTypeRegistry(graphPriIndex)

  // Look up the address book (loaded from public registry)
  var result =
    profile.typeRegistryForClass(rdf.sym(Vocab.VCARD.AddressBook))
  t.deepEqual(result.private, [])  // no private registry matches
  t.equal(result.public.length, 1)  // one public registry match

  // Look up the SIOC posts (loaded from private registry)
  result =
    profile.typeRegistryForClass(rdf.sym('http://rdfs.org/sioc/ns#Post'))
  t.deepEqual(result.public, [])  // no public registry matches
  t.equal(result.private.length, 1)  // one public registry match
  t.end()
})
