'use strict'

var test = require('tape')
var SolidProfile = require('../../lib/solid-profile')
var parseGraph = require('../../lib/graph-util').parseGraph

var rawProfileSource = require('../resources/profile-ldnode')
var sampleProfileUrl = 'https://localhost:8443/profile/card'
var parsedProfileGraph = parseGraph(sampleProfileUrl,
  rawProfileSource, 'text/turtle')

test('SolidProfile empty profile test', function (t) {
  t.plan(6)
  let profile = new SolidProfile()
  t.notOk(profile.webId, 'Empty profile should not have webId set')
  t.notOk(profile.externalResources.inbox, 'Empty profile - no inbox')
  t.deepEqual(profile.externalResources.preferences, [],
    'Empty profile - no preferences')
  t.deepEqual(profile.externalResources.storage, [],
    'Empty profile - no storage')
  t.deepEqual(profile.relatedProfiles.sameAs, [],
    'Empty profile - no sameAs')
  t.deepEqual(profile.relatedProfiles.seeAlso, [],
    'Empty profile - no seeAlso')
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
  t.deepEqual(profile.externalResources.preferences, expectedPreferences)
  t.end()
})

test('SolidProfile inbox test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedInboxLink = 'https://localhost:8443/inbox/'
  t.equal(profile.externalResources.inbox, expectedInboxLink)
  t.end()
})

test('SolidProfile storage test', function (t) {
  let profile = new SolidProfile(sampleProfileUrl, parsedProfileGraph)
  let expectedStorageLinks = ['https://localhost:8443/']
  t.deepEqual(profile.externalResources.storage, expectedStorageLinks)
  t.end()
})
