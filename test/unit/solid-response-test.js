'use strict'

var test = require('tape')
var SolidResponse = require('../../lib/solid-response')

test('empty SolidResponse test', function (t) {
  t.plan(4)
  let response = new SolidResponse()
  t.notOk(response.xhr, 'An empty response should have an empty .xhr property')
  t.notOk(response.user, 'An empty response should not have the user set')
  t.notOk(response.isLoggedIn(), 'User should not be logged in')
  t.notOk(response.exists(), 'Resource should not exist for empty header')
})

test('SolidResponse user.isLoggedIn test', function (t) {
  t.plan(1)
  let response = new SolidResponse()
  response.user = 'https://localhost/profile/card#me'
  t.ok(response.isLoggedIn(), 'User should be logged in if they have the user string set')
})
