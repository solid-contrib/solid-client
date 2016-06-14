'use strict'

const test = require('tape')
const acl = require('../../lib/permissions/authorization').acls
const Authorization = require('../../lib/permissions/authorization')
const PermissionSet = require('../../lib/permissions/permission-set')

const resourceUrl = 'https://bob.example.com/docs/file1'
const aclUrl = 'https://bob.example.com/docs/file1.acl'
const containerUrl = 'https://alice.example.com/docs/'
const containerAclUrl = 'https://alice.example.com/docs/.acl'
const bobWebId = 'https://bob.example.com/#me'
const aliceWebId = 'https://alice.example.com/#me'
// Not really sure what group webIDs will look like, not yet implemented:
const groupWebId = 'https://devteam.example.com/something'

var rdf = require('../../lib/util/rdf-parser').rdflib
const parseGraph = require('../../lib/util/graph-util').parseGraph
const rawAclSource = require('../resources/acl-container-ttl')
const parsedAclGraph = parseGraph(aclUrl, rawAclSource, 'text/turtle')

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
    .addPermission(bobWebId, acl.READ)
    .addPermission(aliceWebId, [acl.READ, acl.WRITE])
  t.notOk(ps.isEmpty())
  t.equal(ps.count(), 2)
  let auth = ps.permissionFor(bobWebId)
  t.equal(auth.agent, bobWebId)
  t.equal(auth.resourceUrl, resourceUrl)
  t.equal(auth.resourceType, Authorization.RESOURCE)
  t.ok(auth.allowsRead())
  t.notOk(auth.allowsWrite())
  // adding further permissions for an existing agent just merges access modes
  ps.addPermission(bobWebId, acl.WRITE)
  // should still only be 2 authorizations
  t.equal(ps.count(), 2)
  auth = ps.permissionFor(bobWebId)
  t.ok(auth.allowsWrite())

  // Now remove the added permission
  ps.removePermission(bobWebId, acl.READ)
  // Still 2 authorizations, agent1 has a WRITE permission remaining
  t.equal(ps.count(), 2)
  auth = ps.permissionFor(bobWebId)
  t.notOk(auth.allowsRead())
  t.ok(auth.allowsWrite())

  // Now, if you remove the remaining WRITE permission from agent1, that whole
  // authorization is removed
  ps.removePermission(bobWebId, acl.WRITE)
  t.equal(ps.count(), 1, 'Only one authorization should remain')
  t.notOk(ps.permissionFor(bobWebId),
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
  ps.addPermission(bobWebId, acl.READ)
  let auth = ps.permissionFor(bobWebId)
  t.ok(auth.isInherited(),
    'An authorization intended for a container should be inherited by default')
  t.end()
})

test('a PermissionSet() for a resource (not container)', function (t) {
  let ps = new PermissionSet(containerUrl)
  t.notOk(ps.isAuthInherited())
  ps.addPermission(bobWebId, acl.READ)
  let auth = ps.permissionFor(bobWebId)
  t.notOk(auth.isInherited(),
    'An authorization intended for a resource should not be inherited by default')
  t.end()
})

test('a PermissionSet can be initialized from an .acl resource', function (t) {
  let ps = new PermissionSet(containerUrl, containerAclUrl,
    PermissionSet.CONTAINER)
  ps.initFromGraph(parsedAclGraph)
  let auth = ps.permissionFor(aliceWebId)
  t.ok(auth, 'Container acl should have an authorization for Alice')
  t.equal(auth.resourceUrl, containerUrl)
  t.ok(auth.isInherited())
  t.ok(auth.allowsWrite() && auth.allowsWrite() && auth.allowsControl())
  t.equal(ps.count(), 2)
  let otherUrl = 'https://alice.example.com/profile/card'
  let publicAuth = ps.permissionFor(Authorization.EVERYONE, otherUrl)
  t.ok(publicAuth.everyone())
  t.notOk(publicAuth.isInherited())
  t.ok(publicAuth.allowsRead())
  t.end()
})

test('PermissionSet equals test 1', function (t) {
  let ps1 = new PermissionSet()
  let ps2 = new PermissionSet()
  t.ok(ps1.equals(ps2))
  t.end()
})

test('PermissionSet equals test 2', function (t) {
  let ps1 = new PermissionSet(resourceUrl)
  let ps2 = new PermissionSet()
  t.notOk(ps1.equals(ps2))
  ps2.resourceUrl = resourceUrl
  t.ok(ps1.equals(ps2))

  ps1.aclUrl = aclUrl
  t.notOk(ps1.equals(ps2))
  ps2.aclUrl = aclUrl
  t.ok(ps1.equals(ps2))
  t.end()
})

test('PermissionSet equals test 3', function (t) {
  let ps1 = new PermissionSet(containerUrl, containerAclUrl,
    PermissionSet.CONTAINER)
  let ps2 = new PermissionSet(containerUrl, containerAclUrl)
  t.notOk(ps1.equals(ps2))
  ps2.resourceType = PermissionSet.CONTAINER
  t.ok(ps1.equals(ps2))
  t.end()
})

test('PermissionSet equals test 4', function (t) {
  let ps1 = new PermissionSet(resourceUrl)
  ps1.addPermission(aliceWebId, acl.READ)
  let ps2 = new PermissionSet(resourceUrl)
  t.notOk(ps1.equals(ps2))
  ps2.addPermission(aliceWebId, acl.READ)
  t.ok(ps1.equals(ps2))
  t.end()
})

test.only('PermissionSet serialized & deserialized round trip test', function (t) {
  let ps = new PermissionSet(containerUrl, containerAclUrl,
    PermissionSet.CONTAINER)
  ps.initFromGraph(parsedAclGraph)
  t.ok(ps.equals(ps), 'A PermissionSet should equal itself')
  return ps.serialize()
    .then((serializedTurtle) => {
      // Now that the PermissionSet is serialized to a Turtle string,
      // let's re-parse that string into a new graph
      let parsedGraph = parseGraph(containerAclUrl, serializedTurtle,
        'text/turtle')
      let ps2 = new PermissionSet(containerUrl, containerAclUrl,
        PermissionSet.CONTAINER)
      ps2.initFromGraph(parsedGraph)
      t.ok(ps.equals(ps2),
        'A PermissionSet serialized and re-parsed should equal the original one')
      t.end()
    })
})
