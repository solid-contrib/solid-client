'use strict'

var test = require('tape')
var SolidProfile = require('../../src/solid/profile')
var parseGraph = require('../../src/util/graph-util').parseGraph

var rdf = require('../../src/util/rdf-parser')
var vocab = require('solid-namespace')(rdf)

var rawProfileSource = require('../resources/profile-extended')
var sampleProfileUrl = 'https://localhost:8443/profile/card'
var parsedProfileGraph = parseGraph(sampleProfileUrl,
  rawProfileSource, 'text/turtle', rdf)


function getPrefsGraph (urlPrefs) {
  let rawPrefsSource = require('../resources/profile-private')
  let graphPrefs = parseGraph(urlPrefs, rawPrefsSource, 'text/turtle', rdf)
  return graphPrefs
}

/**
 * Returns a sample test profile with the following graphs loaded:
 *   - test/resources/profile-extended.js
 *   - test/resources/profile-private.js
 */
function sampleExtendedProfile () {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
  let urlPrivateProfile = 'https://localhost:8443/settings/prefs.ttl'
  let graphPrivateProfile = getPrefsGraph(urlPrivateProfile)
  profile.appendFromGraph(graphPrivateProfile, urlPrivateProfile)
  profile.isLoaded = true
  return profile
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
  t.notOk(profile.hasStorage(), 'Empty profile - hasStorage() false')
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
  let profile = new SolidProfile(profileUrl, parsedProfileGraph, rdf)
  // Make sure the webId (different from the profileUrl) was parsed correctly
  let expectedWebId = 'https://localhost:8443/profile/card#me'
  t.equal(profile.webId, expectedWebId)
})

test('SolidProfile parsed profile test', function (t) {
  let profileUrl = 'https://localhost:8443/profile/card'
  let profile = new SolidProfile(profileUrl, parsedProfileGraph, rdf)
  t.equal(profile.name, 'Alice',
    'Name should be pre-loaded for a parsed profile')
  t.equal(profile.picture, 'https://localhost:8443/profile/img.png',
    'Picture url should be pre-loaded for a parsed profile')
  t.end()
})

test('SolidProfile .find() test', function (t) {
  let profileUrl = 'https://localhost:8443/profile/card'
  let profile = new SolidProfile(profileUrl, parsedProfileGraph, rdf)
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
  let profile = new SolidProfile(profileUrl, parsedProfileGraph, rdf)
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
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
  let expectedPreferences = 'https://localhost:8443/settings/prefs.ttl'
  t.equal(profile.preferences.uri, expectedPreferences)
  t.end()
})

test('SolidProfile relatedProfilesLinks() test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
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
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
  let expectedInboxLink = 'https://localhost:8443/inbox/'
  t.equal(profile.inbox.uri, expectedInboxLink)
  t.end()
})

test('SolidProfile storage test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
  let expectedStorageLinks = ['https://localhost:8443/']
  t.deepEqual(profile.storage, expectedStorageLinks)
  t.ok(profile.hasStorage())
  t.end()
})

test('SolidProfile extended profile test', function (t) {
  // Load the initial parsed profile graph
  // The public profile has the link to publicTypeIndex.ttl
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph, rdf)
  // Test that the parsed profile graph is loaded, and contains the name
  let name = profile.parsedGraph
    .any(rdf.sym(profile.webId), vocab.foaf('name')).value
  t.equal(name, 'Alice')

  // Also load and parse the private profile (prefs.ttl) resource
  // This is where the link to privateTypeIndex.ttl comes from
  profile = sampleExtendedProfile()
  // profile is an Extended Profile at this point

  // Make sure the original parsed graph is not overwritten at this point
  name = profile.parsedGraph
    .any(rdf.sym(profile.webId), vocab.foaf('name')).value
  t.equal(name, 'Alice')
  t.end()
})

test('SolidProfile typeRegistryDefaultContainer() test', function (t) {
  let profile = new SolidProfile()
  t.equal(profile.typeRegistryDefaultContainer(), '/profile/',
    'Default type registry uri for a profile without a web id should be /profile/')

  let profileUrl = 'https://example.com/test/card'
  profile = new SolidProfile(profileUrl)
  t.equal(profile.typeRegistryDefaultContainer(), 'https://example.com/test/',
    'Default type registry uri should use the same container as profile')
  t.end()
})

test('SolidProfile privateProfileUri() test', function (t) {
  let profile = new SolidProfile()
  t.equal(profile.privateProfileUri(), '/settings/prefs.ttl',
    'Default private profile uri for new profile should be /settings/prefs.ttl')

  t.end()
})

test('SolidProfile hasTypeRegistry*() test', function (t) {
  let profileEmpty = new SolidProfile()
  t.throws(function () {
    profileEmpty.hasTypeRegistryPrivate()
  }, 'Calling hasTypeRegistryPrivate() on unloaded profile should throw an error')
  t.throws(function () {
    profileEmpty.hasTypeRegistryPublic()
  }, 'Calling hasTypeRegistryPublic() on unloaded profile should throw an error')

  // Fake loading the profile. Now the hasTypeRegistry* methods should be false
  profileEmpty.isLoaded = true
  t.notOk(profileEmpty.hasTypeRegistryPublic(),
    'Empty just-loaded profile should not have a public type registry')
  t.notOk(profileEmpty.hasTypeRegistryPrivate(),
    'Empty just-loaded profile should not have a private type registry')

  let profileExtended = sampleExtendedProfile()
  t.ok(profileExtended.hasTypeRegistryPublic(),
    'Sample extended profile should have a link to the public type registry')
  t.ok(profileExtended.hasTypeRegistryPrivate(),
    'Sample extended profile should have a link to the private type registry')
  t.end()
})
