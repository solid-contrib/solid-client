'use strict'
/**
 * @module solid-profile
 */
module.exports = SolidProfile
var rdf = require('./rdf-parser').rdflib
var Vocab = require('./vocab')

/**
 * Provides convenience methods for a WebID Profile.
 * Used by `identity.getProfile()`
 * @class SolidProfile
 * @constructor
 */
function SolidProfile (profileUrl, parsedProfile) {
  /**
   * Links to profile-related external resources such as Preferences,
   * Inbox location, storage locations, etc.
   * @property externalResources
   * @type Object
   */
  this.externalResources = {
    inbox: null,
    preferences: [],
    storage: []
  }

  /**
   * Parsed graph of the WebID Profile document
   * @property parsedGraph
   * @type Object
   */
  this.parsedGraph = parsedProfile

  /**
   * Links to "see also" profile documents. Typically loaded immediately
   * after retrieving the initial WebID Profile document.
   * @property relatedProfiles
   * @type Object
   */
  this.relatedProfiles = {
    sameAs: [],
    seeAlso: []
  }

  /**
   * WebId URL (the `foaf:primaryTopic` of the profile document)
   * @property webId
   * @type String
   */
  this.webId = null

  if (!profileUrl) {
    return
  }
  /**
   * Location of the base WebID Profile document (minus the hash fragment).
   * @property baseProfileUrl
   * @type String
   */
  this.baseProfileUrl = (profileUrl.indexOf('#') >= 0)
    ? profileUrl.slice(0, profileUrl.indexOf('#'))
    : profileUrl

  if (parsedProfile) {
    this.initFromGraph(parsedProfile)
  }
}

/**
 * Initializes a profile from a parsed profile RDF graph
 * @method initFromGraph
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 */
SolidProfile.prototype.initFromGraph = function initFromGraph (parsedProfile) {
  if (!parsedProfile) {
    return
  }
  try {
    this.webId = extractWebId(this.baseProfileUrl, parsedProfile).uri
  } catch (e) {
    throw new Error('Unable to parse WebID from profile')
  }
  var webId = rdf.sym(this.webId)

  // Init sameAs and seeAlso
  this.relatedProfiles.sameAs = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.OWL.sameAs))
  this.relatedProfiles.seeAlso = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.RDFS.seeAlso))

  // Init preferencesFile links
  this.externalResources.preferences = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.PIM.preferencesFile))

  // Init inbox (singular)
  this.externalResources.inbox = parseLink(parsedProfile, webId,
    rdf.sym(Vocab.SOLID.inbox))

  // Init storage
  this.externalResources.storage = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.PIM.storage))
}

/**
 * Returns an array of related external profile links (sameAs and seeAlso)
 * @method relatedProfilesLinks
 * @return {Array<String>}
 */
SolidProfile.prototype.relatedProfilesLinks = function relatedProfilesLinks () {
  return this.relatedProfiles.sameAs
    .concat(this.relatedProfiles.seeAlso)
}

/**
 * Convenience method, returns a URIs for a user's Inbox
 * @method inbox
 * @return {String}
 */
SolidProfile.prototype.inbox = function inbox () {
  return this.externalResources.inbox
}

/**
 * Convenience method, returns an array of URIs for a user's preferences docs
 * @method preferences
 * @return {Array<String>}
 */
SolidProfile.prototype.preferences = function preferences () {
  return this.externalResources.preferences
}

/**
 * Convenience method, returns an array of root storage URIs for a user profile
 * @method storage
 * @return {Array<String>}
 */
SolidProfile.prototype.storage = function storage () {
  return this.externalResources.storage
}

/**
 * Extracts the WebID symbol from a parsed profile graph.
 * @method extractWebId
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 * @return {rdf.Symbol} WebID symbol
 */
function extractWebId (baseProfileUrl, parsedProfile) {
  var subj = rdf.sym(baseProfileUrl)
  var pred = rdf.sym(Vocab.FOAF.primaryTopic)
  var match = parsedProfile.any(subj, pred)
  return match
}

/**
 * Extracts the first URI from a parsed graph that matches parameters
 * @method parseLinks
 * @param graph {rdf.IndexedFormula}
 * @param subject {rdf.Symbol}
 * @param predicate {rdf.Symbol}
 * @param object {rdf.Symbol}
 * @param source {rdf.Symbol}
 * @return {String} URI that matches the parameters
 */
function parseLink (graph, subject, predicate, object, source) {
  var first = graph.any(subject, predicate, object, source)
  if (first) {
    return first.uri
  } else {
    return null
  }
}

/**
 * Extracts the URIs from a parsed graph that match parameters
 * @method parseLinks
 * @param graph {rdf.IndexedFormula}
 * @param subject {rdf.Symbol}
 * @param predicate {rdf.Symbol}
 * @param object {rdf.Symbol}
 * @param source {rdf.Symbol}
 * @return {Array<String>} Array of link URIs that match the parameters
 */
function parseLinks (graph, subject, predicate, object, source) {
  var links = []
  var matches = graph.statementsMatching(subject,
    predicate, object, source)
  matches.forEach(function (match) {
    links.push(match.object.uri)
  })
  return links
}
