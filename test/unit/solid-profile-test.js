'use strict'

var test = require('tape')
var SolidProfile = require('../../lib/solid-profile')
var $rdf = require('rdflib')

var rawProfileSource = `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix pro: <./>.
@prefix n0: <http://xmlns.com/foaf/0.1/>.
@prefix sp: <http://www.w3.org/ns/pim/space#>.
@prefix loc: </>.
@prefix terms: <http://www.w3.org/ns/solid/terms#>.
@prefix inbox: </inbox/>.
@prefix cert: <http://www.w3.org/ns/auth/cert#>.
@prefix ter: <http://purl.org/dc/terms/>.
@prefix XML: <http://www.w3.org/2001/XMLSchema#>.

   pro:card a n0:PersonalProfileDocument; n0:maker <#me>; n0:primaryTopic <#me> .
<#me>
    a    n0:Person;
    cert:key
       <#key-1455289666916>;
    sp:preferencesFile
       </settings/prefs.ttl>;
    sp:storage
       loc:;
    terms:inbox
       inbox:.
<#key-1455289666916>
    ter:created
       "2016-02-12T15:07:46.916Z"^^XML:dateTime;
    ter:title
       "Created by ldnode";
    a    cert:RSAPublicKey;
    rdfs:label
       "LDNode Localhost Test Cert";
    cert:exponent
       "65537"^^XML:int;
    cert:modulus
        "970E88053BC7D146A50AFAB79044B9D3BACE8B1283AB98BBDD9B598799AEB9711A7DA9A2CCA50A9F5D30C776EA06FA749F84A359B2CBC9DEF9F4DF7C27E7ED143A25E5F658CC12C87986482200969A3C04AB29BED20860791CEA1D515952821E1FFEE4CBF5F5F9949D6E2C88CDAFEB64C5D610A3B97E58AD19585B4DFDD2AA662FDB8F7889EBAA97D53FEE5740B71549E00A8DA0565DF2A901718D60AC6281642D592C865921F525640BC2FB8BC9EF79A3171F156120C41557374CE1FE735A8948C43B44399495EB4392E57C6FC17B4AD72ABA831C1BF40EA75C01F79CDFEE95CA38DAA7C4DDDFEC4ECED90091D3E68B7C0D364BEF5C454849FE6AA5E5167801"^^XML:hexBinary.
`

var sampleProfileUrl = 'https://localhost:8443/profile/card'
// var sampleWebId = 'https://localhost:8443/profile/card#me'
var parsedProfileGraph = parseProfile(sampleProfileUrl, rawProfileSource)

function parseProfile (profileUrl, rdfProfileGraph) {
  var parsedGraph = $rdf.graph()
  var contentType = 'text/turtle'
  $rdf.parse(rdfProfileGraph, parsedGraph, profileUrl,
    contentType)
  return parsedGraph
}

test('SolidProfile empty profile test', function (t) {
  t.plan(4)
  let profile = new SolidProfile()
  t.notOk(profile.webId, 'Empty profile should not have webId set')
  t.notOk(profile.externalResources.inbox, 'Empty profile - no inbox')
  t.deepEqual(profile.externalResources.preferences, [],
    'Empty profile - no preferences')
  t.deepEqual(profile.externalResources.storage, [],
    'Empty profile - no storage')
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
