'use strict'

var solid = SolidClient
var vocab = solid.vocab

var serverUrl = 'https://localhost:8443/'
var profileUrl = serverUrl + 'profile/test-profile-card'
var rawProfileSource = require('test-minimal-profile')
var prefsUrl = serverUrl + 'settings/test-test.ttl'
var rawPrefsSource = require('test-minimal-prefs')
var defaultPrivateTypeRegistryUrl = serverUrl + 'profile/privateTypeIndex.ttl'
var defaultPublicTypeRegistryUrl = serverUrl + 'profile/publicTypeIndex.ttl'
var defaultPrivateAppRegistryUrl = serverUrl + 'profile/privateAppRegistry.ttl'
var defaultPublicAppRegistryUrl = serverUrl + 'profile/publicAppRegistry.ttl'

function clearRegistries () {
  return clearResource(defaultPublicTypeRegistryUrl)
    .then(function () {
      return clearResource(defaultPrivateTypeRegistryUrl)
    })
}

function clearResource (url) {
  return solid.web.del(url)
    .catch(function () {
      // do nothing (likely tried to delete a non-existent resource)
    })
}

function ensureProfile (profileUrl) {
  var createProfile = false
  return solid.web.head(profileUrl)
    .catch(function (error) {
      if (error.code === 404) {
        console.log('Profile not found.')
        createProfile = true
      } else {
        console.log('Error on HEAD profile url:', error)
      }
      return createProfile
    })
    .then(function () {
      if (createProfile) {
        console.log('Creating test profile...')
        return solid.web.put(profileUrl, rawProfileSource, 'text/turtle')
      } else {
        console.log('Profile detected, no problem.')
      }
    })
    .catch(function (error) {
      console.log('Error creating test profile:', error)
    })
    .then(function () {
      if (createProfile) {
        console.log('Profile created.')
      }
    })
}

function resetProfile (url) {
  console.log('Resetting profile...')
  // First, delete the current profile
  return clearResource(url)
    .then(function () {
      // Re-add the profile from template
      return ensureProfile(url)
    })
    .then(function () {
      // Delete the private profile (prefs.ttl)
      return clearResource(prefsUrl)
    })
    .then(function () {
      // Re-add the private profile
      return solid.web.put(prefsUrl, rawPrefsSource, 'text/turtle')
    })
    .then(function () {
      return solid.getProfile(profileUrl)
    })
}

QUnit.module('SolidProfile tests', {
  /**
   * Runs after the last test in this module
   */
  after: function (details) {
    return resetProfile(profileUrl)
      .then(function () {
        console.log('Profile reset.')
        return clearRegistries()
      })
  }
})

QUnit.test('getProfile() test', function (assert) {
  assert.expect(3)
  return ensureProfile(profileUrl)
    .then(function () {
      return solid.getProfile(profileUrl)
    })
    .then(function (profile) {
      assert.ok(profile.isLoaded)
      assert.deepEqual(profile.response.types,
        ['http://www.w3.org/ns/ldp#Resource'])
      assert.deepEqual(profile.storage, [serverUrl])
    })
})

QUnit.test('initTypeRegistryPublic() test', function (assert) {
  assert.expect(6)
  var profile
  return clearResource(defaultPublicTypeRegistryUrl)
    .then(function () {
      // Make sure registry does not exist
      // return resetProfile(profileUrl)
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      return solid.typeRegistry.initTypeRegistryPublic(profile)
    })
    .then(function () {
      // Check to make sure the type index is loaded after init
      assert.ok(profile.hasTypeRegistryPublic())
      assert.equal(profile.typeIndexListed.uri, defaultPublicTypeRegistryUrl,
        'public type index uri should be loaded after registry init')
      assert.ok(profile.typeIndexListed.graph,
        'public type index graph should be loaded after init')
      // reload the profile
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.hasTypeRegistryPublic(),
        'hasTypeRegistryPublic() should be true after initTypeRegistryPublic() + profile reload')
      assert.equal(profile.typeIndexListed.uri, defaultPublicTypeRegistryUrl,
        'public type index uri should be loaded after registry init + profile reload')
      // The profile has been reloaded, but the type registry wasn't loaded.
      // Load it now.
      return profile.loadTypeRegistry()
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.typeIndexListed.graph,
        'public type index graph should be loaded after profile reload + loadTypeRegistry()')
      // Test to make sure that the freshly initialized registry is empty
    })
    .then(function () {
      return clearResource(defaultPublicTypeRegistryUrl)
    })
})

QUnit.test('initTypeRegistryPrivate() test', function (assert) {
  assert.expect(6)
  var profile
  return clearResource(defaultPrivateTypeRegistryUrl)
    .then(function () {
      // Make sure registry does not exist
      // return resetProfile(profileUrl)
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      return solid.typeRegistry.initTypeRegistryPrivate(profile)
    })
    .then(function () {
      // Check to make sure the type index is loaded after init
      assert.ok(profile.hasTypeRegistryPrivate())
      assert.equal(profile.typeIndexUnlisted.uri, defaultPrivateTypeRegistryUrl,
        'private type index uri should be loaded after registry init')
      assert.ok(profile.typeIndexUnlisted.graph,
        'private type index graph should be loaded after init')
      // reload the profile
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.hasTypeRegistryPrivate(),
        'hasTypeRegistryPrivate() should be true after initTypeRegistryPrivate() + profile reload')
      assert.equal(profile.typeIndexUnlisted.uri, defaultPrivateTypeRegistryUrl,
        'private type index uri should be loaded after registry init + profile reload')
      // The profile has been reloaded, but the type registry wasn't loaded.
      // Load it now.
      return profile.loadTypeRegistry()
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.typeIndexUnlisted.graph,
        'private type index graph should be loaded after profile reload + loadTypeRegistry()')
      // Test to make sure that the freshly initialized registry is empty
    })
    .then(function () {
      return clearResource(defaultPrivateTypeRegistryUrl)
    })
})

QUnit.test('registerType() test', function (assert) {
  assert.expect(4)
  var classToRegister = vocab.sioc('Post')
  var locationToRegister = 'https://localhost:8443/posts-container/'
  var isListed = true
  var profile
  return clearRegistries()
    .then(function () {
      return resetProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      return profile.registerType(classToRegister, locationToRegister,
        'container', isListed)
    })
    .then(function (profileResult) {
      profile = profileResult
      // Now the type is registered, and the profile's type registry is refreshed
      // querying the registry now will include the new container
      var registrations = profile.typeRegistryForClass(vocab.sioc('Post'))
      assert.equal(registrations.length, 1)
      var newRegistration = registrations[0]
      assert.equal(newRegistration.locationType, 'container')
      assert.equal(newRegistration.locationUri, locationToRegister)
      assert.equal(newRegistration.rdfClass.uri, vocab.sioc('Post').uri)
    })
})

/**
 * Note: unregisterType() depends on registerType() having run first.
 */
QUnit.test('unregisterType() test', function (assert) {
  assert.expect(1)
  var classToRemove = vocab.sioc('Post')
  var isListed = true
  var profile
  return solid.getProfile(profileUrl)
    .then(function (profileResult) {
      profile = profileResult
      // At this point, the profile has been loaded, but the type registries
      // have not been. They will be loaded during unregisterType()
      return profile.unregisterType(classToRemove, isListed)
    })
    .then(function (profileResult) {
      profile = profileResult
      // Check to make sure the registration was removed
      var registrations = profile.typeRegistryForClass(vocab.sioc('Post'))
      assert.equal(registrations.length, 0)
    })
    .then(function () {
      return clearRegistries()
    })
})

QUnit.test('initAppRegistryPublic() test', function (assert) {
  assert.expect(7)
  var profile
  return clearResource(defaultPublicAppRegistryUrl)
    .then(function () {
      // Make sure registry does not exist
      // return resetProfile(profileUrl)
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      return solid.appRegistry.initAppRegistryPublic(profile)
    })
    .then(function () {
      // Check to make sure the app registry is loaded after init
      assert.ok(profile.hasAppRegistryPublic())
      assert.equal(profile.appRegistryListed.uri, defaultPublicAppRegistryUrl,
        'public app registry uri should be loaded after registry init')
      assert.ok(profile.appRegistryListed.graph,
        'public app registry graph should be loaded after init')
      // reload the profile
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.hasAppRegistryPublic(),
        'hasTypeRegistryPublic() should be true after initAppRegistryPublic() + profile reload')
      assert.equal(profile.appRegistryListed.uri, defaultPublicAppRegistryUrl,
        'public app registry uri should be loaded after registry init + profile reload')
      assert.notOk(profile.appRegistryListed.graph)
      // The profile has been reloaded, but the app registry wasn't loaded.
      // Load it now.
      return profile.loadAppRegistry()
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.appRegistryListed.graph,
        'public app registry graph should be loaded after profile reload + loadAppRegistry()')
      // Test to make sure that the freshly initialized registry is empty
    })
    .then(function () {
      // return clearResource(defaultPublicAppRegistryUrl)
    })
})

QUnit.test('initAppRegistryPrivate() test', function (assert) {
  assert.expect(6)
  var profile
  return clearResource(defaultPrivateAppRegistryUrl)
    .then(function () {
      // Make sure registry does not exist
      // return resetProfile(profileUrl)
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      return solid.appRegistry.initAppRegistryPrivate(profile)
    })
    .then(function () {
      // Check to make sure the app registry is loaded after init
      assert.ok(profile.hasAppRegistryPrivate())
      assert.equal(profile.appRegistryUnlisted.uri, defaultPrivateAppRegistryUrl,
        'private app registry uri should be loaded after registry init')
      assert.ok(profile.appRegistryUnlisted.graph,
        'private app registry graph should be loaded after init')
      // reload the profile
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.hasAppRegistryPrivate(),
        'hasAppRegistryPrivate() should be true after initAppRegistryPrivate() + profile reload')
      assert.equal(profile.appRegistryUnlisted.uri, defaultPrivateAppRegistryUrl,
        'private app registry uri should be loaded after registry init + profile reload')
      // The profile has been reloaded, but the app registry wasn't loaded.
      // Load it now.
      return profile.loadAppRegistry()
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.appRegistryUnlisted.graph,
        'private app registry graph should be loaded after profile reload + loadAppRegistry()')
      // Test to make sure that the freshly initialized registry is empty
    })
    .then(function () {
      return clearResource(defaultPrivateAppRegistryUrl)
    })
})
