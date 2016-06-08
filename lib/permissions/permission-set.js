'use strict'
/**
 * @module permission-set
 * Models the set of Authorizations in a given .acl resource.
 * @see https://github.com/solid/web-access-control-spec for details.
 * The working assumptions here are:
 *   - Model the various permissions in an ACL resource as a set of unique
 *     authorizations, with one agent (or one group), and only
 *     one resource (acl:accessTo) per authorization.
 *   - If the source RDF of the ACL resource has multiple agents or multiple
 *     resources in one authorization, separate them into multiple separate
 *     Authorization objects (with one agent/group and one resourceUrl each)
 *   - A single Authorization object can grant access to multiple modes (read,
 *     write, control, etc)
 *   - By default, all the authorizations in a container's ACL will be marked
 *     as 'to be inherited', that is will have `acl:default` set.
 */

var Authorization = require('./authorization')
var vocab = require('./../vocab')
var rdf = require('../util/rdf-parser').rdflib
var webClient = require('../web')

/**
 * Resource types, used by PermissionSet objects
 * @type {String}
 */
var RESOURCE = 'resource'
var CONTAINER = 'container'

function PermissionSet (resourceUrl, aclUrl, isContainer) {
  /**
   * Hashmap of all Authorizations in this permission set, keyed by a hashed
   * combination of an agent's/group's webId and the resourceUrl.
   * @property authorizations
   * @type {Object}
   */
  this.authorizations = {}
  /**
   * The URL of the resource for which these permissions apply.
   * @property resourceUrl
   * @type {String}
   */
  this.resourceUrl = resourceUrl
  /**
   * The URL of the corresponding ACL resource, at which these permissions will
   * be saved.
   * @property aclUrl
   * @type {String}
   */
  this.aclUrl = aclUrl
  /**
   * Whether this permission set is for a 'container' or a 'resource'.
   * Determines whether or not the inherit/'acl:default' attribute is set on
   * all its Authorizations.
   * @property resourceType
   * @type {String}
   */
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
 * @param webId {String}
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
 * @param webId {String} URL of an agent for which this permission applies
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

/**
 * Returns a list of all the Authorizations that belong to this permission set.
 * Mostly for internal use.
 * @method allAuthorizations
 * @return {Array<Authorization>}
 */
function allAuthorizations () {
  var authList = []
  var auth
  var self = this
  Object.keys(this.authorizations).forEach(function (authKey) {
    auth = self.authorizations[authKey]
    authList.push(auth)
  })
  return authList
}
PermissionSet.prototype.allAuthorizations = allAuthorizations

/**
 * Returns an RDF graph representation of this permission set and all its
 * Authorizations. Used by `save()`.
 * @method buildGraph
 * @private
 * @return {Graph}
 */
function buildGraph () {
  var graph = rdf.graph()
  this.allAuthorizations().forEach(function (auth) {
    graph.add(auth.rdfStatements())
  })
  return graph
}
PermissionSet.prototype.buildGraph = buildGraph

/**
 * Sends a delete request to a particular ACL resource. Intended to be used for
 * an existing loaded PermissionSet, but you can also specify a particular
 * URL to delete.
 * Usage:
 *
 *   ```
 *   // If you have an existing PermissionSet as a result of `getPermissions()`:
 *   solid.getPermissions('https://www.example.com/file1')
 *     .then(function (permissionSet) {
 *       // do stuff
 *       return permissionSet.clear()  // deletes that permissionSet
 *     })
 *   // Otherwise, use the helper function
 *   //   solid.clearPermissions(resourceUrl) instead
 *   solid.clearPermissions('https://www.example.com/file1')
 *     .then(function (response) {
 *       // file1.acl is now deleted
 *     })
 *   ```
 * @method clear
 * @throws {Error} Rejects with an error if it doesn't know where to delete, or
 *   with any XHR errors that crop up.
 * @return {Promise<Request>}
 */
function clear () {
  var aclUrl = this.aclUrl
  if (!aclUrl) {
    return Promise.reject(new Error('Cannot clear - unknown target url'))
  }
  return webClient.del(aclUrl)
}
PermissionSet.prototype.clear = clear

/**
 * Returns the number of Authorizations in this permission set.
 * @method count
 * @return {Number}
 */
function count () {
  return Object.keys(this.authorizations).length
}
PermissionSet.prototype.count = count

/**
 * Returns whether or not this permission set is equal to another one.
 * A PermissionSet is considered equal to another one iff:
 * - It has the same number of authorizations, and each of those authorizations
 *   has a corresponding one in the other set
 * - They are both intended for the same resource (have the same resourceUrl)
 * - They are both intended to be saved at the same aclUrl
 * @method equals
 * @param ps {PermissionSet} The other permission set to compare to
 * @return {Boolean}
 */
function equals (ps) {
  var self = this
  var sameUrl = this.resourceUrl === ps.resourceUrl
  var sameAclUrl = this.aclUrl === ps.aclUrl
  var sameResourceType = this.resourceType === ps.resourceType
  var myAuthKeys = Object.keys(this.authorizations)
  var otherAuthKeys = Object.keys(ps.authorizations)
  if (myAuthKeys.length !== otherAuthKeys.length) { return false }
  var sameAuths = true
  var myAuth, otherAuth
  myAuthKeys.forEach(function (authKey) {
    myAuth = self.authorizations[authKey]
    otherAuth = ps.authorizations[authKey]
    if (!otherAuth) { return false }
    if (!myAuth.equals(otherAuth)) { return false }
  })
  return sameUrl && sameAclUrl && sameResourceType && sameAuths
}
PermissionSet.prototype.equals = equals

/**
 * Iterates over all the authorizations in this permission set.
 * Convenience method.
 * Usage:
 *
 *   ```
 *   solid.getPermissions(resourceUrl)
 *     .then(function (permissionSet) {
 *       permissionSet.forEach(function (auth) {
 *         // do stuff with auth
 *       })
 *     })
 *   ```
 * @method forEach
 * @param callback {Function} Function to apply to each authorization
 */
function forEach (callback) {
  var self = this
  this.allAuthorizations().forEach(function (auth) {
    callback.call(self, auth)
  })
}
PermissionSet.prototype.forEach = forEach

/**
 * Creates and loads all the authorizations from a given RDF graph.
 * Used by `solid.getPermissions()`.
 * @method initFromGraph
 * @param graph {Graph} RDF Graph (parsed from the source ACL)
 */
function initFromGraph (graph) {
  var matches = graph.statementsMatching(null, null, vocab.acl('Authorization'))
  var fragment, agentMatches, mailTos, groupMatches, resourceUrls, auth
  var accessModes, inherit
  var self = this
  // Iterate through each grouping of authorizations in the .acl graph
  matches.forEach(function (match) {
    fragment = match.subject
    // Extract all the authorized agents/groups (acl:agent and acl:agentClass)
    agentMatches = graph.statementsMatching(fragment, vocab.acl('agent'))
    mailTos = agentMatches.filter(isMailTo)
    // Now filter out mailtos
    agentMatches = agentMatches.filter(function (ea) { return !isMailTo(ea) })
    groupMatches = graph.statementsMatching(fragment, vocab.acl('agentClass'))
    // Extract the acl:accessTo statements. (Have to support multiple ones)
    resourceUrls = graph.statementsMatching(fragment, vocab.acl('accessTo'))
    // Extract the access modes
    accessModes = graph.statementsMatching(fragment, vocab.acl('mode'))
    // Check if these permissions are to be inherited
    inherit = graph.any(fragment, vocab.acl('defaultForNew')) ||
        graph.any(fragment, vocab.acl('default'))
    // Create an Authorization object for each agent or group
    //   (and for each resourceUrl (acl:accessTo))
    agentMatches.forEach(function (agentMatch) {
      resourceUrls.forEach(function (resourceUrl) {
        auth = new Authorization(resourceUrl.object.uri, inherit)
        auth.setAgent(agentMatch)
        auth.addMode(accessModes)
        mailTos.forEach(function (mailTo) {
          auth.addMailTo(mailTo)
        })
        self.addAuthorization(auth)
      })
    })
    groupMatches.forEach(function (groupMatch) {
      resourceUrls.forEach(function (resourceUrl) {
        auth = new Authorization(resourceUrl.object.uri, inherit)
        auth.setGroup(groupMatch)
        auth.addMode(accessModes)
        self.addAuthorization(auth)
      })
    })
  })
}
PermissionSet.prototype.initFromGraph = initFromGraph

/**
 * Returns whether or not authorizations added to this permission set be
 * inherited, by default? (That is, should they have acl:default set on them).
 * @method isAuthInherited
 * @return {Boolean}
 */
function isAuthInherited () {
  return this.resourceType === CONTAINER
}
PermissionSet.prototype.isAuthInherited = isAuthInherited

/**
 * Returns whether or not this permission set has any Authorizations added to it
 * @method isEmpty
 * @return {Boolean}
 */
function isEmpty () {
  return this.count() === 0
}
PermissionSet.prototype.isEmpty = isEmpty

/**
 * Returns the corresponding Authorization for a given agent/group webId (and
 * for a given resourceUrl, although it assumes by default that it's the same
 * resourceUrl as the PermissionSet).
 * @method permissionFor
 * @param webId {String} URL of the agent or group
 * @param [resourceUrl] {String}
 * @return {Authorization} Returns the corresponding Authorization, or `null`
 *   if no webId is given, or if no such authorization exists.
 */
function permissionFor (webId, resourceUrl) {
  if (!webId) {
    return null
  }
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

/**
 * @method save
 * @param [aclUrl] {String} Optional URL to save the .ACL resource to. Defaults
 *   to its pre-set `aclUrl`, if not explicitly passed in.
 * @throws {Error} Rejects with an error if it doesn't know where to save, or
 *   with any XHR errors that crop up.
 * @return {Promise<Request>}
 */
function save (aclUrl) {
  aclUrl = aclUrl || this.aclUrl
  if (!aclUrl) {
    return Promise.reject(new Error('Cannot save - unknown target url'))
  }
  return webClient.put(aclUrl, this.serialize())
}
PermissionSet.prototype.save = save

/**
 * Serializes this permission set (and all its Authorizations) to a string RDF
 * representation (Turtle by default).
 * Note: invalid authorizations (ones that don't have at least one agent/group,
 * at least one resourceUrl and at least one access mode) do not get serialized,
 * and are instead skipped.
 * @method serialize
 * @param [contentType='text/turtle'] {String}
 * @throws {Error} Rejects with an error if one is encountered during RDF
 *   serialization.
 * @return {Promise<String>} Graph serialized to contentType RDF syntax
 */
function serialize (contentType) {
  contentType = contentType || 'text/turtle'
  var graph = this.buildGraph()
  var target = null
  var base = null
  return new Promise(function (resolve, reject) {
    rdf.serialize(target, graph, base, contentType, function (err, result) {
      if (err) { return reject(err) }
      if (!result) {
        return reject(new Error('Error serializing the graph to ' +
          contentType))
      }
      resolve(result)
    })
  })
}
PermissionSet.prototype.serialize = serialize

/**
 * Returns whether or not a given agent webId is actually a `mailto:` link.
 * Standalone helper function.
 * @param agent {String|Statement} URL string (or RDF `acl:agent` triple)
 * @return {Boolean}
 */
function isMailTo (agent) {
  if (typeof agent === 'string') {
    return agent.startsWith('mailto:')
  } else {
    return agent.object.uri.startsWith('mailto:')
  }
}

module.exports = PermissionSet
module.exports.RESOURCE = RESOURCE
module.exports.CONTAINER = CONTAINER
module.exports.isMailTo = isMailTo
