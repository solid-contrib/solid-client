'use strict'

const test = require('tape')
const acl = require('../../lib/permissions/authorization').acls
const Authorization = require('../../lib/permissions/authorization')
const PermissionSet = require('../../lib/permissions/permission-set')

const resourceUrl = 'https://bob.example.com/docs/file1'
const aclUrl = 'https://bob.example.com/docs/file1.acl'
const containerUrl = 'https://bob.example.com/docs/'
const agentWebId1 = 'https://bob.example.com/#me'
const agentWebId2 = 'https://alice.example.com/#me'
// Not really sure what group webIDs will look like, not yet implemented:
const groupWebId = 'https://devteam.example.com/something'

// const parseGraph = require('../../lib/util/graph-util').parseGraph
// const rawAclSource = require('../resources/acl-resource-ttl')
// const parsedAclGraph = parseGraph(aclUrl, rawAclSource, 'text/turtle')

test('a new PermissionSet()', function (t) {
  let ps = new PermissionSet()
  t.ok(ps.isEmpty(), 'should be empty')
  t.equal(ps.count(), 0, 'should have a count of 0')
  t.notOk(ps.resourceUrl, 'should have a null resource url')
  t.notOk(ps.aclUrl, 'should have a null acl url')
  t.end()
})

test('a new PermissionSet() for a resource', function (t) {
  let ps = new PermissionSet(resourceUrl)
  t.ok(ps.isEmpty(), 'should be empty')
  t.equal(ps.count(), 0, 'should have a count of 0')
  t.equal(ps.resourceUrl, resourceUrl)
  t.notOk(ps.aclUrl, 'An acl url should be set explicitly')
  t.equal(ps.resourceType, PermissionSet.RESOURCE,
    'A permission set should be for a resource by default (not container)')
  t.end()
})

test('PermissionSet can add and remove authorizations', function (t) {
  let ps = new PermissionSet(resourceUrl, aclUrl)
  t.equal(ps.aclUrl, aclUrl)
  // Notice that addPermission() is chainable:
  ps
    .addPermission(agentWebId1, acl.READ)
    .addPermission(agentWebId2, [acl.READ, acl.WRITE])
  t.notOk(ps.isEmpty())
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

  // Now remove the added permission
  ps.removePermission(agentWebId1, acl.READ)
  // Still 2 authorizations, agent1 has a WRITE permission remaining
  t.equal(ps.count(), 2)
  auth = ps.permissionFor(agentWebId1)
  t.notOk(auth.allowsRead())
  t.ok(auth.allowsWrite())

  // Now, if you remove the remaining WRITE permission from agent1, that whole
  // authorization is removed
  ps.removePermission(agentWebId1, acl.WRITE)
  t.equal(ps.count(), 1, 'Only one authorization should remain')
  t.notOk(ps.permissionFor(agentWebId1),
    'No authorization for agent1 should be found')
  t.end()
})

test('PermissionSet can add and remove group authorizations', function (t) {
  let ps = new PermissionSet(resourceUrl)
  // Let's add an agentClass permission
  ps.addGroupPermission(groupWebId, [acl.READ, acl.WRITE])
  t.equal(ps.count(), 1)
  let auth = ps.permissionFor(groupWebId)
  t.equal(auth.group, groupWebId)
  ps.removePermission(groupWebId, [acl.READ, acl.WRITE])
  t.ok(ps.isEmpty())
  t.end()
})

test('a PermissionSet() for a container', function (t) {
  let isContainer = true
  let ps = new PermissionSet(containerUrl, aclUrl, isContainer)
  t.ok(ps.isAuthInherited())
  ps.addPermission(agentWebId1, acl.READ)
  let auth = ps.permissionFor(agentWebId1)
  t.ok(auth.isInherited(),
    'An authorization intended for a container should be inherited by default')
  t.end()
})

test('a PermissionSet() for a resource (not container)', function (t) {
  let ps = new PermissionSet(containerUrl)
  t.notOk(ps.isAuthInherited())
  ps.addPermission(agentWebId1, acl.READ)
  let auth = ps.permissionFor(agentWebId1)
  t.notOk(auth.isInherited(),
    'An authorization intended for a resource should not be inherited by default')
  t.end()
})
