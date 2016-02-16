'use strict'
/**
 * @module solid-profile
 */
module.exports = SolidProfile
var Vocab = require('./vocab')
var $rdf = require('rdflib')

/**
 * Extracts the WebID symbol from a parsed profile graph.
 * @method extractWebId
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {$rdf.IndexedFormula} RDFLib-parsed user profile
 * @return {$rdf.Symbol} WebID symbol
 */
function extractWebId (baseProfileUrl, parsedProfile) {
  return parsedProfile.any($rdf.sym(baseProfileUrl),
    $rdf.sym(Vocab.FOAF.primaryTopic))
}

/**
 * Extracts the first URI from a parsed graph that matches parameters
 * @method parseLinks
 * @param graph {$rdf.IndexedFormula}
 * @param subject {$rdf.Symbol}
 * @param predicate {$rdf.Symbol}
 * @param object {$rdf.Symbol}
 * @param source {$rdf.Symbol}
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
 * @param graph {$rdf.IndexedFormula}
 * @param subject {$rdf.Symbol}
 * @param predicate {$rdf.Symbol}
 * @param object {$rdf.Symbol}
 * @param source {$rdf.Symbol}
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

/**
 * Provides convenience methods for a WebID Profile.
 * Initialized in `initFromGraph()`
 * @class SolidProfile
 * @constructor
 */
function SolidProfile (profileUrl, parsedProfile) {
  /**
   * Links to profile-related external resources
   * @property externalResources
   * @type Object
   */
  this.externalResources = {
    inbox: null,
    preferences: [],
    storage: []
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
   * Location of the base WebID Profile document (minus the hash fragment)
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
 * @param parsedProfile {$rdf.IndexedFormula} RDFLib-parsed user profile
 */
SolidProfile.prototype.initFromGraph = function initFromGraph (parsedProfile) {
  if (!parsedProfile) {
    return
  }
  this.webId = extractWebId(this.baseProfileUrl, parsedProfile).uri
  var webId = $rdf.sym(this.webId)

  // Init preferencesFile links
  this.externalResources.preferences = parseLinks(parsedProfile, webId,
    $rdf.sym(Vocab.PIM.preferencesFile), null, $rdf.sym(this.baseProfileUrl))

  // Init inbox (singular)
  this.externalResources.inbox = parseLink(parsedProfile, webId,
    $rdf.sym(Vocab.SOLID.inbox))

  // Init storage
  this.externalResources.storage = parseLinks(parsedProfile, webId,
    $rdf.sym(Vocab.PIM.storage), null, $rdf.sym(this.baseProfileUrl))
}
