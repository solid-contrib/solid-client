'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * Currently depends on RDFLib.js
 * @module identity
 */

var solidClient = require('./web')

// common vocabs
// var RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
var RDFS = $rdf.Namespace('http://www.w3.org/2000/01/rdf-schema#')
var OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#')
var PIM = $rdf.Namespace('http://www.w3.org/ns/pim/space#')
var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/')
// var DCT = $rdf.Namespace('http://purl.org/dc/terms/')

/**
 * Appends RDF statements from one graph object to another
 * @method appendGraph
 * @param toGraph {Graph} $rdf.Graph object to append to
 * @param fromGraph {Graph} $rdf.Graph object to append from
 * @param docURI {String} Document URI to use as source
 */
function appendGraph (toGraph, fromGraph, docURI) {
  var source = (docURI) ? $rdf.sym(docURI) : undefined
  fromGraph.statementsMatching(undefined, undefined, undefined, source)
    .forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
}

/**
 * Extracts the WebID symbol from a parsed profile graph.
 * @method extractWebId
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {$rdf.IndexedFormula} RDFLib-parsed user profile
 * @return {$rdf.Symbol} WebID symbol
 */
function extractWebId (baseProfileUrl, parsedProfile) {
  return parsedProfile.any($rdf.sym(baseProfileUrl), FOAF('primaryTopic'))
}

/**
 * Extracts related external resources (sameAs, etc) from a parsed WebID profile
 * @method extractProfileResources
 * @param profileWebId {$rdf.Symbol} WebID of the profile
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {$rdf.IndexedFormula} RDFLib-parsed user profile
 * @return {Array<$rdf.IndexedFormula>} List of RDF graphs representing
 *   external resources related to the profile
 */
function extractProfileResources (profileWebId, baseProfileUrl, parsedProfile) {
  var relatedStatements = []
  var resourcePredicates = [
    OWL('sameAs'), RDFS('seeAlso'), PIM('preferencesFile')
  ]
  resourcePredicates.forEach(function (predicate) {
    var matches = parsedProfile.statementsMatching(profileWebId, predicate,
      undefined, $rdf.sym(baseProfileUrl))
    if (matches.length > 0) {
      relatedStatements = relatedStatements.concat(matches)
    }
  })
  return relatedStatements
}

/**
 * Creates a list of `getParsedGraph()` promises from a
 * Converts a list of RDF graphs to a
 * Loads a list of given RDF graphs via an async `Promise.all()`,
 * which resolves to an array of uri/parsed-graph hashes.
 * @method loadRelated
 * @param resources {Array<$rdf.IndexedFormula>} Array of parsed RDF graphs
 * @param proxyUrl {String} URL template of the proxy to use for CORS
 *                          requests.
 * @param timeout {Number} Request timeout in milliseconds.
 * @return {Promise<Array<Object>>}
 */
function loadGraphs (resources, proxyUrl, timeout) {
  var suppressError = true
  // convert the resource RDF statements to "will load" promises
  var loadPromises = resources.map(function (resource) {
    return solidClient
      .getParsedGraph(resource.object.uri, proxyUrl, timeout, suppressError)
        .then(function (loadedGraph) {
          return {
            uri: resource.object.uri,
            value: loadedGraph
          }
        })
  })
  return Promise.all(loadPromises)
}

/**
 * Fetches a user's WebId profile, follows `sameAs` links,
 *   and return a promise with a parsed RDF graph of the results.
 * @method getProfile
 * @static
 * @param profileUrl {String} WebId or Location of a user's profile.
 * @param [ignoreExtended=false] {Boolean} Does not fetch external resources
 *   related to the profile, if true.
 * @return {Promise<Graph>}
 */
function getProfile (profileUrl, ignoreExtended) {
  var config = require('../config')
  var proxyUrl = config.proxyUrl
  var timeout = config.timeout

  // Load main profile
  return solidClient.getParsedGraph(profileUrl, proxyUrl, timeout)
    .then(function (parsedProfile) {
      if (ignoreExtended) {
        return parsedProfile
      }
      // Set base profile url (drop any hash fragments)
      var baseProfileUrl = (profileUrl.indexOf('#') >= 0)
        ? profileUrl.slice(0, profileUrl.indexOf('#'))
        : profileUrl
      var webId = extractWebId(baseProfileUrl, parsedProfile)
      // find additional external resources to load
      var relatedResources = extractProfileResources(webId, baseProfileUrl,
        parsedProfile)
      if (relatedResources.length === 0) {
        return parsedProfile  // No additional profile resources to load
      } else {
        // Load all related resources, and append them to the parsed profile
        return loadGraphs(relatedResources, proxyUrl, timeout)
          .then(function (loadedGraphs) {
            loadedGraphs.forEach(function (graph) {
              if (graph) {
                appendGraph(parsedProfile, graph.value, graph.uri)
              }
            })
            return parsedProfile
          })
      }
    })
}

module.exports.getProfile = getProfile
module.exports.extractProfileResources = extractProfileResources
