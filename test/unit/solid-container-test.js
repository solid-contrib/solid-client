'use strict'

var test = require('tape')
var SolidResource = require('../../lib/solid/resource')
var SolidContainer = require('../../lib/solid/container')
var SolidResponse = require('../../lib/solid/response')

var rawContainerSource = require('../resources/solid-container-ttl')
var sampleContainerUrl = 'https://localhost:8443/settings/'

function sampleResponse () {
  let response = new SolidResponse()
  response.url = sampleContainerUrl
  response.contentType = function () {
    return 'text/turtle'
  }
  response.raw = function () {
    return rawContainerSource
  }
  return response
}

test('SolidContainer empty container test', function (t) {
  let container = new SolidContainer()
  t.ok(container.isEmpty(), 'Empty container - isEmpty() true')
  t.ok(container.isContainer(), 'Container - isContainer() true')
  t.notOk(container.uri, 'Empty container - null uri')
  t.notOk(container.parsedGraph, 'Empty container - null parsedGraph')
  t.deepEqual(container.contentsUris, [],
    'Empty container - empty contents uri list')
  t.deepEqual(container.containers, {},
    'Empty container - empty hash of sub-containers')
  t.deepEqual(container.resources, {},
    'Empty container - empty hash of non-container resources')
  t.end()
})

test('SolidContainer from parsed response test', function (t) {
  let response = sampleResponse()
  let container = new SolidContainer('/settings/', response)
  t.notOk(container.isEmpty(), 'Container with items - isEmpty() false')
  t.equal(container.response, response)
  // Check that the 'short name' is set
  t.equal(container.name, 'settings')

  // Test that the container's url is overridden to that of the response object
  // (absolute, not relative like in the constructor)
  t.equal(container.uri, 'https://localhost:8443/settings/')

  let expectedTypes = [
    'http://www.w3.org/ns/ldp#BasicContainer',
    'http://www.w3.org/ns/ldp#Container'
  ]
  t.deepEqual(container.types.sort(), expectedTypes)

  // There are 6 total items in the sample /settings/ container
  let expectedLinks = [
    'https://localhost:8443/settings/ajax-loader.gif',
    'https://localhost:8443/settings/index.html',
    'https://localhost:8443/settings/prefs.ttl',
    'https://localhost:8443/settings/privateTypeIndex.ttl',
    'https://localhost:8443/settings/publicTypeIndex.ttl',
    'https://localhost:8443/settings/testcontainer/'
  ]
  t.deepEqual(container.contentsUris, expectedLinks)

  // Of those, only one is a container
  let subContainers = container.containers
  t.equal(Object.keys(subContainers).length, 1)
  let testContainer =
    subContainers['https://localhost:8443/settings/testcontainer/']

  t.ok(testContainer instanceof SolidContainer)
  t.equal(testContainer.name, 'testcontainer')
  expectedTypes = [
    'http://www.w3.org/ns/ldp#BasicContainer',
    'http://www.w3.org/ns/ldp#Container',
    'http://www.w3.org/ns/ldp#Resource'
  ]
  t.deepEqual(testContainer.types.sort(), expectedTypes)

  // And the other 5 are resources
  t.equal(Object.keys(container.resources).length, 5)

  let testResource =
    container.resources['https://localhost:8443/settings/privateTypeIndex.ttl']
  t.ok(testContainer instanceof SolidResource)
  expectedTypes = [
    'http://www.w3.org/ns/ldp#Resource',
    'http://www.w3.org/ns/solid/terms#PrivateTypeIndex'
  ]
  t.deepEqual(testResource.types.sort(), expectedTypes)
  t.equal(testResource.name, 'privateTypeIndex.ttl')

  let findResults =
    container.findByType('http://www.w3.org/ns/solid/terms#PrivateTypeIndex')
  t.equal(findResults[0].name, 'privateTypeIndex.ttl')

  t.end()
})
