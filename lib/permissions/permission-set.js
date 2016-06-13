'use strict'
/**
 * @module permission-set
 */

var Authorization = require('./authorization')
var vocab = require('./../vocab')

/**
 * Resource types, used by PermissionSet objects
 * @type {String}
 */
var RESOURCE = 'resource'
var CONTAINER = 'container'

function PermissionSet (resourceUrl, aclUrl, isContainer) {
  this.authorizations = {}
  this.resourceUrl = resourceUrl
  this.aclUrl = aclUrl
  this.resourceType = isContainer ? CONTAINER : RESOURCE
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
  var auth = new Authorization(this.resourceUrl, this.isAuthInherited())
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
  var auth = new Authorization(this.resourceUrl, this.isAuthInherited())
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

function initFromGraph (graph) {
  var matches = graph.statementsMatching(null, null, vocab.acl('Authorization'))
  var fragment, agentMatches, groupMatches, resourceUrl, auth
  var accessModes, inherit
  var self = this
  // Iterate through each grouping of authorizations in the .acl graph
  matches.forEach(function (match) {
    fragment = match.subject
    // Extract all the authorized agents/groups (acl:agent and acl:agentClass)
    agentMatches = graph.statementsMatching(fragment, vocab.acl('agent'))
    groupMatches = graph.statementsMatching(fragment, vocab.acl('agentClass'))
    // Extract the acl:accessTo
    resourceUrl = graph.any(fragment, vocab.acl('accessTo'))
    // Extract the access modes
    accessModes = graph.statementsMatching(fragment, vocab.acl('mode'))
    // Check if these permissions are to be inherited
    inherit = graph.any(fragment, vocab.acl('defaultForNew')) ||
        graph.any(fragment, vocab.acl('default'))
    // Create an Authorization object for each agent or group
    agentMatches.forEach(function (agentMatch) {
      auth = new Authorization(resourceUrl.uri, inherit)
      auth.setAgent(agentMatch)
      auth.addMode(accessModes)
      self.addAuthorization(auth)
    })
    groupMatches.forEach(function (groupMatch) {
      auth = new Authorization(resourceUrl.uri, inherit)
      auth.setGroup(groupMatch)
      auth.addMode(accessModes)
      self.addAuthorization(auth)
    })
  })
}
PermissionSet.prototype.initFromGraph = initFromGraph

/**
 * Should authorizations added to this permission set be inherited, by default?
 * (That is, should they have acl:default set on them).
 * @method isAuthInherited
 * @returns {Boolean}
 */
function isAuthInherited () {
  return this.resourceType === CONTAINER
}
PermissionSet.prototype.isAuthInherited = isAuthInherited

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
module.exports.RESOURCE = RESOURCE
module.exports.CONTAINER = CONTAINER
