var Solid = require('solid.js')

QUnit.module('web client tests')

QUnit.test('parseLinkHeader test', function (assert) {
  var linkStr = '<testResource.ttl.acl>; rel="acl", <testResource.ttl.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
  var expectedParsedLinks = {
    acl: 'testResource.ttl.acl',
    describedBy: 'testResource.ttl.meta',
    type: 'http://www.w3.org/ns/ldp#Resource'
  }
  var actualParsedLinks = Solid.web.parseLinkHeader(linkStr)

  assert.deepEqual(expectedParsedLinks, actualParsedLinks)
})
