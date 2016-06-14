'use strict'
/**
 * @module authorization
 */

var hash = require('shorthash')
var vocab = require('../vocab')
var rdf = require('../util/rdf-parser').rdflib

var acls = {
  'READ': vocab.acl('Read').uri,
  'WRITE': vocab.acl('Write').uri,
  'APPEND': vocab.acl('Append').uri,
  'CONTROL': vocab.acl('Control').uri
}

/**
 * Inherited authorization (acl:defaultForNew)
 * @type {String}
 */
var INHERIT = true

var EVERYONE = 'http://xmlns.com/foaf/0.1/Agent'

function Authorization (resourceUrl, inherited) {
  this.agent = null
  this.group = null
  this.accessModes = {}
  this.resourceUrl = resourceUrl
  this.inherited = inherited
  this.mailTo = []
}

function addMailTo (agent) {
  if (typeof agent !== 'string') {
    agent = agent.object.uri
  }
  if (agent.startsWith('mailto:')) {
    agent = agent.split(':')[1]
  }
  this.mailTo.push(agent)
  this.mailTo.sort()
}
Authorization.prototype.addMailTo = addMailTo

/**
 * @method addMode
 * @param accessMode {String|Statement|Array<String>|Array<Statement>} One or
 *   more access modes, each as either a uri, or an RDF statement.
 */
function addMode (accessMode) {
  var self = this
  if (Array.isArray(accessMode)) {
    accessMode.forEach(function (ea) {
      self.addModeSingle(ea)
    })
  } else {
    self.addModeSingle(accessMode)
  }
  return self
}
Authorization.prototype.addMode = addMode

/**
 * @method addModeSingle
 * @private
 * @param accessMode {String|Statement} Access mode as either a uri, or an RDF
 *   statement.
 */
function addModeSingle (accessMode) {
  if (typeof accessMode !== 'string') {
    accessMode = accessMode.object.uri
  }
  this.accessModes[accessMode] = true
  return this
}
Authorization.prototype.addModeSingle = addModeSingle

function allowsRead () {
  return this.accessModes[acls.READ]
}
Authorization.prototype.allowsRead = allowsRead

function allowsWrite () {
  return this.accessModes[acls.WRITE]
}
Authorization.prototype.allowsWrite = allowsWrite

function allowsAppend () {
  return this.accessModes[acls.APPEND] || this.accessModes[acls.WRITE]
}
Authorization.prototype.allowsAppend = allowsAppend

function allowsControl () {
  return this.accessModes[acls.CONTROL]
}
Authorization.prototype.allowsControl = allowsControl

function equals (auth) {
  var sameAgent = this.agent === auth.agent
  var sameGroup = this.group === auth.group
  var sameUrl = this.resourceUrl === auth.resourceUrl
  var myModeKeys = Object.keys(this.accessModes)
  var authModeKeys = Object.keys(auth.accessModes)
  var sameNumberModes = myModeKeys.length === authModeKeys.length
  var sameInherit = this.inherited === auth.inherited
  var sameMailTos = JSON.stringify(this.mailTo) === JSON.stringify(auth.mailTo)
  var sameModes = true
  myModeKeys.forEach(function (key) {
    if (!auth.accessModes[key]) { return false }
  })
  return sameAgent && sameGroup && sameUrl && sameNumberModes && sameModes &&
      sameInherit && sameMailTos
}
Authorization.prototype.equals = equals

function everyone () {
  return this.group === EVERYONE
}
Authorization.prototype.everyone = everyone

function hashFragment () {
  if (!this.webId || !this.resourceUrl) {
    throw new Error('Cannot call hashFragment() on an incomplete authorization')
  }
  var hashFragment = hashFragmentFor(this.webId(), this.resourceUrl)
  return hashFragment
}
Authorization.prototype.hashFragment = hashFragment

/**
 * Returns whether or not this authorization is empty (that is, whether it has
 * any access modes like Read, Write, etc, set on it)
 * @method isEmpty
 * @return {Boolean}
 */
function isEmpty () {
  return Object.keys(this.accessModes).length === 0
}
Authorization.prototype.isEmpty = isEmpty

/**
 * Returns whether this authorization is for a container and should be inherited
 * (that is, contain `acl:default`).
 * This is a helper function (instead of the raw attribute) to match the rest
 * of the api.
 * @return {Boolean}
 */
function isInherited () {
  return this.inherited
}
Authorization.prototype.isInherited = isInherited

/**
 * Returns whether this authorization is valid (ready to be serialized into
 * an RDF graph ACL resource). This requires all three of the following:
 *   1. Either an agent or an agentClass/group (returned by `webId()`)
 *   2. A resource URL (`acl:accessTo`)
 *   3. At least one access mode (read, write, etc) (returned by `isEmpty()`)
 * @method isValid
 * @return {Boolean}
 */
function isValid () {
  return this.webId() &&
    this.resourceUrl &&
    !this.isEmpty()
}
Authorization.prototype.isValid = isValid

/**
 * Merges the access modes of a given authorization with the access modes of
 * this one (Set union).
 * @method mergeWith
 * @param auth
 * @throws {Error} Error if the other authorization is for a different webId
 *   or resourceUrl (`acl:accessTo`)
 */
function mergeWith (auth) {
  if (this.hashFragment() !== auth.hashFragment()) {
    throw new Error('Cannot merge authorizations with different agent id or resource url (accessTo)')
  }
  for (var accessMode in auth.accessModes) {
    this.addMode(accessMode)
  }
}
Authorization.prototype.mergeWith = mergeWith

/**
 * Returns an array of RDF statements representing this authorization.
 *
 * Used by `PermissionSet.serialize()`.
 * @return {Array<Statement>} List of RDF statements representing this Auth,
 *   or an empty array if this authorization is invalid.
 */
function rdfStatements () {
  // var graph = rdf.graph()
  // Make sure the authorization has at least one agent/group and `accessTo`
  if (!this.webId() || !this.resourceUrl) {
    return []  // This Authorization is invalid, return empty array
  }
  var statement
  var fragment = rdf.sym('#' + this.hashFragment())
  var statements = [
    rdf.st(
      fragment,
      vocab.rdf('type'),
      vocab.acl('Authorization'))
  ]
  if (this.agent) {
    statement = rdf.st(fragment, vocab.acl('agent'), rdf.sym(this.agent))
    statements.push(statement)
  }
  if (this.group) {
    statement = rdf.st(fragment, vocab.acl('agentClass'), rdf.sym(this.group))
    statements.push(statement)
  }
  statement = rdf.st(fragment, vocab.acl('accessTo'), rdf.sym(this.resourceUrl))
  statements.push(statement)
  var modes = Object.keys(this.accessModes)
  modes.forEach(function (accessMode) {
    statement = rdf.st(fragment, vocab.acl('mode'), rdf.sym(accessMode))
    statements.push(statement)
  })
  if (this.inherited) {
    statement = rdf.st(fragment, vocab.acl('defaultForNew'),
      rdf.sym(this.resourceUrl))
    statements.push(statement)
  }
  return statements
}
Authorization.prototype.rdfStatements = rdfStatements

function removeMode (accessMode) {
  var self = this
  if (Array.isArray(accessMode)) {
    accessMode.forEach(function (ea) {
      self.removeModeSingle(ea)
    })
  } else {
    self.removeModeSingle(accessMode)
  }
  return self
}
Authorization.prototype.removeMode = removeMode

/**
 * @method removeModeSingle
 * @private
 * @param accessMode {String|Statement} URI or RDF statement
 */
function removeModeSingle (accessMode) {
  if (typeof accessMode !== 'string') {
    accessMode = accessMode.object.uri
  }
  delete this.accessModes[accessMode]
}
Authorization.prototype.removeModeSingle = removeModeSingle

function setAgent (agent) {
  if (typeof agent !== 'string') {
    // This is an RDF statement
    agent = agent.object.uri
  }
  if (agent === EVERYONE) {
    this.setPublic()
  } else if (this.group) {
    throw new Error('Cannot set agent, authorization already has a group set')
  }
  if (agent.startsWith('mailto:')) {
    this.addMailTo(agent)
  } else {
    this.agent = agent
  }
}
Authorization.prototype.setAgent = setAgent

function setGroup (agentClass) {
  if (typeof agentClass !== 'string') {
    // This is an RDF statement
    agentClass = agentClass.object.uri
  }
  if (this.agent) {
    throw new Error('Cannot set group, authorization already has an agent set')
  }
  this.group = agentClass
}
Authorization.prototype.setGroup = setGroup

function setPublic () {
  this.setGroup(EVERYONE)
}
Authorization.prototype.setPublic = setPublic

function webId () {
  return this.agent || this.group
}
Authorization.prototype.webId = webId

// --- Standalone (non-instance) functions --

function hashFragmentFor (webId, resourceUrl) {
  var hashKey = webId + '-' + resourceUrl
  return hash.unique(hashKey)
}

module.exports = Authorization
module.exports.acls = acls
module.exports.INHERIT = INHERIT
module.exports.EVERYONE = EVERYONE
module.exports.hashFragmentFor = hashFragmentFor
