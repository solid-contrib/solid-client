'use strict'
/**
 * @module authorization
 */

var hash = require('shorthash')

var acls = {
  'READ': 'read',
  'WRITE': 'write',
  'APPEND': 'append',
  'CONTROL': 'control'
}
var RESOURCE = 'resource'
var CONTAINER = 'container'

var EVERYONE = 'http://xmlns.com/foaf/0.1/Agent'

function Authorization (resourceUrl, resourceType) {
  this.agent = null
  this.group = null
  this.modes = {}
  this.resourceUrl = resourceUrl
  this.resourceType = resourceType || RESOURCE
}

function addMode (accessMode) {
  var self = this
  if (Array.isArray(accessMode)) {
    accessMode.forEach(function (ea) {
      self.modes[ea] = true
    })
  } else if (typeof accessMode === 'string') {
    self.modes[accessMode] = true
  } else {
    throw new RangeError('addMode() expects a string')
  }
  return self
}
Authorization.prototype.addMode = addMode

function allowsRead () {
  return this.modes[acls.READ]
}
Authorization.prototype.allowsRead = allowsRead

function allowsWrite () {
  return this.modes[acls.WRITE]
}
Authorization.prototype.allowsWrite = allowsWrite

function allowsAppend () {
  return this.modes[acls.APPEND] || this.modes[acls.WRITE]
}
Authorization.prototype.allowsAppend = allowsAppend

function allowsControl () {
  return this.modes[acls.CONTROL]
}
Authorization.prototype.allowsControl = allowsControl

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

function removeMode (accessMode) {
  var self = this
  if (Array.isArray(accessMode)) {
    accessMode.forEach(function (ea) {
      delete self.modes[ea]
    })
  } else if (typeof accessMode === 'string') {
    delete self.modes[accessMode]
  } else {
    throw new RangeError('addMode() expects a string')
  }
  return self
}
Authorization.prototype.removeMode = removeMode

function setAgent (agent) {
  if (agent === EVERYONE) {
    this.setPublic()
  } else if (this.group) {
    throw new Error('Cannot set agent, authorization already has a group set')
  }
  this.agent = agent
}
Authorization.prototype.setAgent = setAgent

function setGroup (agentClass) {
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
module.exports.RESOURCE = RESOURCE
module.exports.CONTAINER = CONTAINER
module.exports.EVERYONE = EVERYONE
module.exports.hashFragmentFor = hashFragmentFor
