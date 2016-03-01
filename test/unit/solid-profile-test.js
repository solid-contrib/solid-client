'use strict'

var test = require('tape')
var SolidProfile = require('../../lib/solid/profile')
var parseGraph = require('../../lib/util/graph-util').parseGraph

var rawProfileSource = require('../resources/profile-ldnode')
var sampleProfileUrl = 'https://localhost:8443/profile/card'
var parsedProfileGraph = parseGraph(sampleProfileUrl,
  rawProfileSource, 'text/turtle')

var vocab = require('../../lib/vocab')
var rdf = require('../../lib/util/rdf-parser').rdflib

function getPrefsGraph (urlPrefs) {
  let rawPrefsSource = require('../resources/profile-prefs')
  let graphPrefs = parseGraph(urlPrefs, rawPrefsSource, 'text/turtle')
  return graphPrefs
}

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

test('SolidProfile parse webId test', function (t) {
  t.plan(1)
  let profileUrl = 'https://localhost:8443/profile/card'
  let profile = new SolidProfile(profileUrl, parsedProfileGraph)
  // Make sure the webId (different from the profileUrl) was parsed correctly
  let expectedWebId = 'https://localhost:8443/profile/card#me'
  t.equal(profile.webId, expectedWebId)
})

test('SolidProfile preferences list test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedPreferences = ['https://localhost:8443/settings/prefs.ttl']
  t.deepEqual(profile.preferences(), expectedPreferences)
  t.end()
})

test('SolidProfile relatedProfilesLinks() test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  // Make sure the Preferences, seeAlso and sameAs are parsed
  let expectedLinks =
    [
      'https://localhost:8443/settings/prefs.ttl',
      'https://localhost:8443/settings/privateProfile1.ttl',
      'https://localhost:8443/settings/privateProfile2.ttl'
    ]
  t.deepEqual(profile.relatedProfilesLinks().sort(), expectedLinks)
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

test('SolidProfile extended profile test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedStorageLinks = ['https://localhost:8443/']
  t.deepEqual(profile.storage(), expectedStorageLinks)
  t.end()
})

test('SolidProfile type registry indexes test', function (t) {
  // Load the initial parsed profile graph
  // The public profile has the link to publicTypeIndex.ttl
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  // Test that the parsed profile graph is loaded, and contains the name
  let name = profile.parsedGraph
    .any(rdf.sym(profile.webId), vocab.foaf('name')).value
  t.equal(name, 'Alice')

  // Also load and parse the Preferences resource
  // This is where the link to privateTypeIndex.ttl comes from
  let urlPrefs = 'https://localhost:8443/settings/prefs.ttl'
  let graphPrefs = getPrefsGraph(urlPrefs)
  profile.appendFromGraph(graphPrefs, urlPrefs)
  // profile is an Extended Profile at this point

  // Make sure the original parsed graph is not overwritten at this point
  name = profile.parsedGraph
    .any(rdf.sym(profile.webId), vocab.foaf('name')).value
  t.equal(name, 'Alice')
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
  t.deepEqual(result.private, [])  // no private registry matches
  t.equal(result.public.length, 1)  // one public registry match

  // Look up the SIOC posts (loaded from private registry)
  result =
    profile.typeRegistryForClass(vocab.sioc('Post'))
  t.deepEqual(result.public, [])  // no public registry matches
  t.equal(result.private.length, 1)  // one public registry match
  t.end()
})
