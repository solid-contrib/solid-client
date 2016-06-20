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
  t.notOk(profile.isLoaded, 'Empty profile - isLoaded should be false')
  t.notOk(profile.webId, 'Empty profile should not have webId set')
  t.notOk(profile.response, 'Empty profile - no response object')
  t.notOk(profile.inbox.uri || profile.inbox.graph, 'Empty profile - no inbox')
  t.notOk(profile.preferences.uri || profile.preferences.graph,
    'Empty profile - no preferences')
  t.deepEqual(profile.storage, [],
    'Empty profile - no storage')
  t.notOk(profile.typeIndexUnlisted.uri || profile.typeIndexUnlisted.graph,
    'Empty profile - no private type registry index')
  t.notOk(profile.typeIndexListed.uri || profile.typeIndexListed.graph,
    'Empty profile - no public type registry index')
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

test('SolidProfile parsed profile test', function (t) {
  let profileUrl = 'https://localhost:8443/profile/card'
  let profile = new SolidProfile(profileUrl, parsedProfileGraph)
  t.equal(profile.name, 'Alice',
    'Name should be pre-loaded for a parsed profile')
  t.equal(profile.picture, 'https://localhost:8443/profile/img.png',
    'Picture url should be pre-loaded for a parsed profile')
  t.end()
})

test('SolidProfile .find() test', function (t) {
  let profileUrl = 'https://localhost:8443/profile/card'
  let profile = new SolidProfile(profileUrl, parsedProfileGraph)
  let expectedAnswer = 'Alice'
  t.equal(profile.find(vocab.foaf('name')), expectedAnswer,
    '.find() should fetch name')
  expectedAnswer = 'https://localhost:8443/settings/privateProfile2.ttl'
  t.equal(profile.find(vocab.owl('sameAs')), expectedAnswer,
    '.find() should fetch owl:sameAs')

  t.notOk(profile.find(vocab.solid('invalidPredicate')),
    'Trying to find() non-existent resources should return null')
  t.end()
})

test('SolidProfile .findAll() test', function (t) {
  let profileUrl = 'https://localhost:8443/profile/card'
  let profile = new SolidProfile(profileUrl, parsedProfileGraph)
  let expectedAnswer = ['Alice']
  t.deepEqual(profile.findAll(vocab.foaf('name')), expectedAnswer,
    '.findAll() should fetch all names')
  expectedAnswer = ['https://localhost:8443/settings/privateProfile2.ttl']
  t.deepEqual(profile.findAll(vocab.owl('sameAs')), expectedAnswer,
    '.findAll() should fetch all owl:sameAs values')

  t.deepEqual(profile.findAll(vocab.solid('invalidPredicate')), [],
    'findAll() on non-existent resources should return []')
  t.end()
})

test('SolidProfile preferences test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedPreferences = 'https://localhost:8443/settings/prefs.ttl'
  t.equal(profile.preferences.uri, expectedPreferences)
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
  t.equal(profile.inbox.uri, expectedInboxLink)
  t.end()
})

test('SolidProfile storage test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedStorageLinks = ['https://localhost:8443/']
  t.deepEqual(profile.storage, expectedStorageLinks)
  t.end()
})

test('SolidProfile extended profile test', function (t) {
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
