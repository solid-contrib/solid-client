'use strict'

var solid = require('solid')

var serverUrl = 'https://localhost:8443/'

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
