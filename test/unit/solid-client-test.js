'use strict'
const test = require('tape')
const solid = require('../../src/index')

test('solid-permissions api export test', t => {
  t.ok(solid.acl, 'solid-permissions lib not exposed as solid.acl')
  t.ok(solid.acl.Authorization)
  t.ok(solid.acl.PermissionSet)
  t.ok(solid.acl.READ && solid.acl.WRITE && solid.acl.APPEND &&
    solid.acl.CONTROL)
  t.ok(solid.acl.ALL_MODES)
  t.end()
})
