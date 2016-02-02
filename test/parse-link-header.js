'use strict'

var test = require('tape')
var webClient = require('../lib/web.js')

test('parse link header test', function (t) {
  t.plan(1)
  let linkStr = '<testResource.ttl.acl>; rel="acl", <testResource.ttl.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
  let expectedParsedLinks = {
    acl: 'testResource.ttl.acl',
    describedBy: 'testResource.ttl.meta',
    type: 'http://www.w3.org/ns/ldp#Resource'
  }
  let actualParsedLinks = webClient.parseLinkHeader(linkStr)

  t.deepEqual(expectedParsedLinks, actualParsedLinks)
})
