'use strict'

var solid = require('solid')

var serverUrl = 'https://localhost:8443/'

QUnit.module('web client tests')

QUnit.test('web.head() test', function (assert) {
  assert.expect(2)
  return solid.web.head(serverUrl)
    .then(function (result) {
      assert.equal(result.xhr.status, 200)
      assert.equal(result.type, 'http://www.w3.org/ns/ldp#BasicContainer')
    })
})
