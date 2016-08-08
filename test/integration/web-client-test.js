'use strict'

var solid = SolidClient

var serverUrlWeb = 'https://localhost:8443'

QUnit.module('web client tests')

QUnit.test('web.head() test', function (assert) {
  assert.expect(2)
  return solid.web.head(serverUrl)
    .then(function (result) {
      assert.equal(result.xhr.status, 200)
      assert.deepEqual(result.types,
        ['http://www.w3.org/ns/ldp#BasicContainer',
          'http://www.w3.org/ns/ldp#Container'])
    })
})

QUnit.test('web.createContainer() test', function (assert) {
  assert.expect(6)
  var containerName = 'qunit-test-container'
  var folderLocation, resourceLocation
  var serverUrl = serverUrlWeb
  console.log('serverUrl 1:', serverUrl)
  return solid.web.createContainer(serverUrl, containerName)
    .then(function (response) {
      console.log('Container created')
      console.log(response)
      assert.equal(response.xhr.status, 201,
        'Result of createContainer() should be a 201')
      assert.deepEqual(response.types,
        ['http://www.w3.org/ns/ldp#BasicContainer',
          'http://www.w3.org/ns/ldp#Container'])
      assert.ok(response.isContainer(),
        'Result of createContainer() should be isContainer()')
      folderLocation = serverUrl + response.xhr.getResponseHeader('Location')
      console.log('Location:', folderLocation)
      return solid.web.get(folderLocation)
    })
    .catch(function (err) {
      console.log('Error creating container', err)
    })
    .then(function (response) {
      console.log('Listing response:', response)
      assert.ok(response.isContainer(),
        'Result of listing should be isContainer()')
      assert.ok(response.isEmpty(), 'Newly created container should be empty')
      return solid.web.post(folderLocation, '')
    })
    .then(function (response) {
      console.log('New resource POSTed:', response)
      resourceLocation = serverUrl + response.xhr.getResponseHeader('Location')
      return solid.web.get(folderLocation)
    })
    .then(function (response) {
      console.log('Listing, after resource posted:', response)
      assert.equal(response.contentsUris.length, 1,
        'After posting, a folder should contain 1 resource')
      console.log('Cleaning up test resource')
      return solid.web.del(resourceLocation)
    })
    .catch(function (err) {
      console.log('Error deleting test resource', err)
    })
    .then(function (response) {
      console.log('result of deleting resource:', response)
      return solid.web.del(folderLocation)
    })
    .catch(function (err) {
      console.log('Error deleting test resource', err)
    })
    .then(function (response) {
      console.log('result of deleting:', response)
      return solid.web.get(folderLocation)
    })
    .catch(function (err) {
      console.log('GETing a deleted container:', err)
    })
})
