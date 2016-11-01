'use strict'
/**
 * @module app-registration
 */
module.exports = AppRegistration

var hash = require('shorthash')
var vocab = require('solid-namespace')
var registry = require('../registry')

/**
 * Represents a Solid App Registry registration (an entry in the App Registry).
 * Returned in a list by `profile.appForType()`
 * @class AppRegistration
 * @constructor
 * @param [options={}] {Object} Hashmap of app registration options.
 * @param [options.name] {String} App name (required for valid registration)
 * @param [options.shortdesc] {String}
 * @param [options.redirectTemplateUri] {String}
 * @param types {Array<String>|Array<NamedNode>} List of types / RDF classes for
 *   which this app is registered. This app will be used to open those types
 *   by Solid servers that support this functionality.
 * @param [isListed=false] {Boolean} Register in a listed or unlisted registry.
 */
function AppRegistration (options, types, isListed) {
  options = options || {}
  /**
   * Is this registered in a listed or unlisted registry
   * @property isListed
   * @type Boolean
   */
  this.isListed = isListed
  /**
   * App name
   * @property name
   * @type String
   */
  this.name = options.name
  /**
   * URI template that will be redirected to if the server gets a request
   * for one of the registered types. For example:
   * 'https://solid.github.io/contacts/?uri={uri}'
   * @property redirectTemplateUri
   * @type String
   */
  this.redirectTemplateUri = options.redirectTemplateUri
  /**
   * Absolute URI (with fragment identifier) of the registration.
   * This is only set when this instance is created as a result of querying
   * the app registry.
   * @property registrationUri
   * @type String
   */
  this.registrationUri = null
  /**
   * Short description of the app
   * @property shortdesc
   * @type String
   */
  this.shortdesc = options.shortdesc
  /**
   * List of types / RDF classes for which this app is registered.
   * This app will be used to open those types by Solid servers that support
   * this functionality.
   * @property types
   * @type {Array<String>|Array<NamedNode>}
   */
  this.types = types || []
}

/**
 * Returns a unique hash fragment identifier for this registration (a hash of
 * the `redirectTemplateUri` property).
 * @method hashFragment
 * @return {String}
 */
AppRegistration.prototype.hashFragment = function hashFragment () {
  var fragmentId = hash.unique(this.redirectTemplateUri)
  return fragmentId
}

/**
 * Initializes the registration details from a parsed registry graph.
 * @method initFromGraph
 * @param subject {NamedNode} Hash fragment uri of the registration
 * @param graph {Graph} Parsed registry graph
 * @param rdf {RDF} RDF Library
 */
AppRegistration.prototype.initFromGraph =
  function initFromGraph (subject, graph, rdf) {
    this.registrationUri = subject.uri
    this.isListed = !!registry.isListed(graph, rdf)
    this.types = []
    var self = this
    var ns = vocab(rdf)
    // Load the types
    graph.statementsMatching(subject, ns.app('commonType'))
      .forEach(function (typeStatement) {
        self.types.push(typeStatement.object.uri)
      })
    var match
    match = graph.any(subject, ns.app('name'))
    if (match) { this.name = match.value }
    match = graph.any(subject, ns.app('shortdesc'))
    if (match) { this.shortdesc = match.value }
    match = graph.any(subject, ns.app('redirectTemplateUri'))
    if (match) { this.redirectTemplateUri = match.value }
  }

/**
 * Is this a valid app registration entry that can be added to the registry?
 * (A registration is considered valid if it has a name, at least one type,
 * and a redirectUri)
 * @method isValid
 * @return {Boolean}
 */
AppRegistration.prototype.isValid = function isValid () {
  return this.name && this.redirectTemplateUri && this.types.length > 0
}

/**
 * Returns an array of RDF statements representing this app registration.
 * @method rdfStatements
 * @return {Array<Statement>} List of RDF statements representing registration,
 *   or an empty array if this registration is invalid.
 */
AppRegistration.prototype.rdfStatements = function rdfStatements (rdf) {
  var hashFragment = rdf.namedNode('#' + this.hashFragment())
  var statements = []
  var ns = vocab(rdf)
  // example: '<#ab09fd> a solid:AppRegistration;'
  statements.push(
    rdf.triple(hashFragment, ns.rdf('type'), ns.solid('AppRegistration')),
    rdf.triple(hashFragment, ns.app('name'), this.name),
    rdf.triple(hashFragment, ns.app('shortdesc'), this.shortdesc),
    rdf.triple(hashFragment, ns.app('redirectTemplateUri'),
      this.redirectTemplateUri)
  )
  this.types.forEach(function (type) {
    statements.push(
      rdf.triple(hashFragment, ns.app('commonType'), type)
    )
  })

  return statements
}
