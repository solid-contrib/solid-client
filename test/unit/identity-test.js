'use strict'
const test = require('tape')
const sinon = require('sinon')

const $rdf = require('rdflib')
const identity = require('../../src/identity')

test('getProfile can handle WebID which does HTTP 303 redirect', t => {
  let webId = 'https://idp.example/alice'
  let profileUrl = 'https://dataset.example/alice'
  let graph = $rdf.graph()
  graph.add($rdf.sym(profileUrl),
            $rdf.sym('http://xmlns.com/foaf/0.1/primaryTopic'),
            $rdf.sym(webId))
  let response = { parsedGraph: sinon.stub().returns(graph),
                  url: profileUrl }
  let client = { get: sinon.stub().returns(Promise.resolve(response)) }
  identity.getProfile(webId, { ignoreExtended: true }, client, $rdf)
    .then(profile => {
      t.equal(profile.webId, webId)
      t.equal(profile.baseProfileUrl, profileUrl)
      t.end()
    }).catch((e) => {
      t.error(e)
      t.end()
    })
})
