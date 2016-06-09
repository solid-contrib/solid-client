'use strict'

var test = require('tape')
var acl = require('../../lib/permissions/authorization').acls
var Authorization = require('../../lib/permissions/authorization')
var PermissionSet = require('../../lib/permissions/permission-set')

const resourceUrl = 'https://bob.example.com/docs/file1'
const agentWebId1 = 'https://bob.example.com/#me'
const agentWebId2 = 'https://alice.example.com/#me'
// Not really sure what group webIDs will look like, not yet implemented:
const groupWebId = 'https://devteam.example.com/something'

test('a new PermissionSet()', function (t) {
  let ps = new PermissionSet()
  t.ok(ps.isEmpty(), 'should be empty')
  t.equal(ps.count(), 0, 'should have a count of 0')
  t.notOk(ps.resourceUrl, 'should have a null resource url')
  t.end()
})

test('a new PermissionSet() for a resource', function (t) {
  let ps = new PermissionSet(resourceUrl)
  t.ok(ps.isEmpty(), 'should be empty')
  t.equal(ps.count(), 0, 'should have a count of 0')
  t.equal(ps.resourceUrl, resourceUrl)
  t.end()
})

test('PermissionSet can add authorizations', function (t) {
  let ps = new PermissionSet(resourceUrl)
  // Notice that addPermission() is chainable:
  ps
    .addPermission(agentWebId1, acl.READ)
    .addPermission(agentWebId2, [acl.READ, acl.WRITE])
  t.equal(ps.count(), 2)
  let auth = ps.permissionFor(agentWebId1)
  t.equal(auth.agent, agentWebId1)
  t.equal(auth.resourceUrl, resourceUrl)
  t.equal(auth.resourceType, Authorization.RESOURCE)
  t.ok(auth.allowsRead())
  t.notOk(auth.allowsWrite())
  // adding further permissions for an existing agent just merges access modes
  ps.addPermission(agentWebId1, acl.WRITE)
  // should still only be 2 authorizations
  t.equal(ps.count(), 2)
  auth = ps.permissionFor(agentWebId1)
  t.ok(auth.allowsWrite())
  t.end()
})
