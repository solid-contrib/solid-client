'use strict'

var solid = require('solid')

var serverUrl = 'https://localhost:8443/'
var profileUrl = serverUrl + 'profile/card'
// var sampleProfileUrl = 'https://localhost:8443/profile/card'

QUnit.module('SolidProfile tests')

/**
 * Runs before the test suite, creates a `profile/test-profile-card` resource
 * (see `test/resources/profile-ldnode.js` for the Turtle source code).
 */
QUnit.begin(function (details) {
  // solid.web.put(profileUrl, rawProfileSource, 'text/turtle')
})

QUnit.test('getProfile() test', function (assert) {
  assert.expect(3)
  return solid.getProfile(profileUrl)
    .then(function (profile) {
      assert.ok(profile.isLoaded)
      assert.equal(profile.response.type, 'http://www.w3.org/ns/ldp#Resource')
      assert.deepEqual(profile.storage, [serverUrl])
    })
})
