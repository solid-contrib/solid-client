'use strict'

var test = require('tape')
var webUtil = require('../../lib/util/web-util')

test('parse link header test', function (t) {
  t.plan(1)
  let linkStr = '<testResource.ttl.acl>; rel="acl", <testResource.ttl.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
  let expectedParsedLinks = {
    acl: 'testResource.ttl.acl',
    describedBy: 'testResource.ttl.meta',
    type: 'http://www.w3.org/ns/ldp#Resource'
  }
  let actualParsedLinks = webUtil.parseLinkHeader(linkStr)

  t.deepEqual(expectedParsedLinks, actualParsedLinks)
})

test('parseAllowedMethods() test with no headers', function (t) {
  t.plan(1)
  t.deepEqual(webUtil.parseAllowedMethods(), {},
    'Empty parseAllowedMethods() should result in an empty object')
})

test('parseAllowedMethods() test', function (t) {
  t.plan(1)
  let allowMethodsHeader = 'OPTIONS, HEAD, GET, POST, PUT, DELETE'
  let acceptPatchHeader = 'application/sparql-update'
  let expectedAllowedMethods = {
    'delete': true,
    'get': true,
    'head': true,
    'options': true,
    'patch': true,
    'post': true,
    'put': true
  }
  let allowedMethods = webUtil.parseAllowedMethods(allowMethodsHeader,
    acceptPatchHeader)
  t.deepEqual(allowedMethods, expectedAllowedMethods)
})

test('parseAllowedMethods() does not support json-patch', function (t) {
  t.plan(1)
  let allowMethodsHeader = null
  let acceptPatchHeader = 'application/json'
  let expectedAllowedMethods = {}
  let allowedMethods = webUtil.parseAllowedMethods(allowMethodsHeader,
    acceptPatchHeader)
  t.deepEqual(allowedMethods, expectedAllowedMethods, 'JSON-Patch method is not supported')
})
