'use strict'

var test = require('tape')
var identity = require('../../lib/identity')
var registerType = identity.registerType
// var vocab = require('../../lib/vocab')
var SolidProfile = require('../../lib/solid/profile')

test('registerType - throws error for non-loaded profile', function (t) {
  let profile = new SolidProfile()  // not loaded
  t.throws(function () {
    registerType(profile)
  })
  t.end()
})
