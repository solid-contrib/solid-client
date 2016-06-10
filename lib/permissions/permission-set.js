'use strict'
/**
 * @module permission-set
 */

var Authorization = require('./authorization')

function PermissionSet (resourceUrl, resourceType) {
  this.authorizations = {}
  this.resourceUrl = resourceUrl
  this.resourceType = resourceType || Authorization.RESOURCE
}

/**
 * Adds a given Authorization instance to the permission set.
 * Low-level function, clients should use `addPermission()` instead, in most
 * cases.
 * @method addAuthorization
 * @param auth {Authorization}
 * @return {PermissionSet} Returns self (chainable)
 */
function addAuthorization (auth) {
  var hashFragment = auth.hashFragment()
  if (hashFragment in this.authorizations) {
    // An authorization for this agent and resource combination already exists
    // Merge the incoming access modes with its existing ones
    this.authorizations[hashFragment].mergeWith(auth)
  } else {
    this.authorizations[hashFragment] = auth
  }
  return this
}
PermissionSet.prototype.addAuthorization = addAuthorization

/**
 * Adds an agentClass/group permission for the given access mode and agent id.
 * @method addGroupPermission
 * @param webId
 * @param accessMode {String|Array<String>}
 * @return {PermissionSet} Returns self (chainable)
 */
function addGroupPermission (webId, accessMode) {
  var auth = new Authorization(this.resourceUrl, this.resourceType)
  auth.setGroup(webId)
  auth.addMode(accessMode)
  this.addAuthorization(auth)
  return this
}
PermissionSet.prototype.addGroupPermission = addGroupPermission

/**
 * Adds a permission for the given access mode and agent id.
 * @method addPermission
 * @param webId
 * @param accessMode {String|Array<String>}
 * @return {PermissionSet} Returns self (chainable)
 */
function addPermission (webId, accessMode) {
  var auth = new Authorization(this.resourceUrl, this.resourceType)
  auth.setAgent(webId)
  auth.addMode(accessMode)
  this.addAuthorization(auth)
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

function permissionFor (webId, resourceUrl) {
  resourceUrl = resourceUrl || this.resourceUrl
  var hashFragment = Authorization.hashFragmentFor(webId, resourceUrl)
  return this.authorizations[hashFragment]
}
PermissionSet.prototype.permissionFor = permissionFor

/**
 * Deletes a given Authorization instance from the permission set.
 * Low-level function, clients should use `removePermission()` instead, in most
 * cases.
 * @method removeAuthorization
 * @param auth {Authorization}
 * @return {PermissionSet} Returns self (chainable)
 */
function removeAuthorization (auth) {
  var hashFragment = auth.hashFragment()
  delete this.authorizations[hashFragment]
  return this
}
PermissionSet.prototype.removeAuthorization = removeAuthorization

/**
 * Removes one or more access modes from an authorization in this permission set
 * (defined by a unique combination of agent/group id (webId) and a resourceUrl).
 * If no more access modes remain for that authorization, it's deleted from the
 * permission set.
 * @method removePermission
 * @param webId
 * @param accessMode {String|Array<String>}
 * @return {PermissionSet} Returns self (via a chainable function)
 */
function removePermission (webId, accessMode) {
  var auth = this.permissionFor(webId, this.resourceUrl)
  if (!auth) {
    // No authorization for this webId + resourceUrl exists. Bail.
    return this
  }
  // Authorization exists, remove the accessMode from it
  auth.removeMode(accessMode)
  if (auth.isEmpty()) {
    // If no more access modes remain, after removing, delete it from this
    // permission set
    this.removeAuthorization(auth)
  }
  return this
}
PermissionSet.prototype.removePermission = removePermission

module.exports = PermissionSet
