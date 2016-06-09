'use strict'
/**
 * @module permission-set
 */

var Authorization = require('./authorization')

function PermissionSet (resourceUrl) {
  this.authorizations = {}
  this.resourceUrl = resourceUrl
}

function addPermission (webId, mode, permissionResource) {
  var resourceUrl = permissionResource || this.resourceUrl
  var resourceType = Authorization.RESOURCE
  var auth = new Authorization(resourceUrl, resourceType)
  auth.setAgent(webId)
  var hashFragment = auth.hashFragment()
  if (hashFragment in this.authorizations) {
    // An authorization for this agent and resource combination already exists
    // Merge the incoming access modes with its existing ones
    this.authorizations[hashFragment].addMode(mode)
  } else {
    auth.addMode(mode)
    this.authorizations[hashFragment] = auth
  }
  return this
}
PermissionSet.prototype.addPermission = addPermission

function count () {
  return Object.keys(this.authorizations).length
}
PermissionSet.prototype.count = count

function isEmpty () {
  return this.count() === 0
}
PermissionSet.prototype.isEmpty = isEmpty

function permissionFor (agentOrGroupId, resourceUrl) {
  resourceUrl = resourceUrl || this.resourceUrl
  var hashFragment = Authorization.hashFragmentFor(agentOrGroupId, resourceUrl)
  return this.authorizations[hashFragment]
}
PermissionSet.prototype.permissionFor = permissionFor

module.exports = PermissionSet
