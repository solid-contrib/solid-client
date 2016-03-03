'use strict'
/**
 * @module profile
 */
module.exports = SolidProfile
var rdf = require('../util/rdf-parser').rdflib
var vocab = require('../vocab')
var identity = require('../identity')
var graphUtil = require('../util/graph-util')
var parseLinks = graphUtil.parseLinks

/**
 * Provides convenience methods for a WebID Profile.
 * Used by `identity.getProfile()`
 * @class SolidProfile
 * @constructor
 */
function SolidProfile (profileUrl, parsedProfile, response) {
  /**
   * Main Inbox resource for this profile (link and parsed graph)
   * @property inbox
   * @type Object
   */
  this.inbox = {
    uri: null,
    graph: null
  }
  /**
   * Has this profile been loaded? (Set in `identity.getProfile()`)
   * @property isLoaded
   * @type Boolean
   */
  this.isLoaded = false
  /**
   * Links to root storage containers (read/write dataspaces for this profile)
   * @property storage
   * @type Array<String>
   */
  this.storage = []
  /**
   * Links to the public and private type registry indexes.
   * @property typeIndexes
   * @type Array<String>
   */
  this.typeIndexes = []
  /**
   * Public Type registry index (link and parsed graph)
   * @property typeIndexPublic
   * @type Object
   */
  this.typeIndexPublic = {
    uri: null,
    graph: null
  }
  /**
   * Private Type registry index (link and parsed graph)
   * @property typeIndexPrivate
   * @type rdf.Object
   */
  this.typeIndexPrivate = {
    uri: null,
    graph: null
  }
  /**
   * Parsed graph of the extended WebID Profile document.
   * Included the WebID profile, preferences, and related profile graphs
   * @property parsedGraph
   * @type rdf.Graph
   */
  this.parsedGraph = null
  /**
   * Profile preferences object (link and parsed graph).
   * Is considered a part of the 'Extended Profile'
   * @property preferences
   * @type Object
   */
  this.preferences = {
    uri: null,
    graph: null
  }
  /**
   * SolidResponse instance from which this profile object was created.
   * Contains the raw profile source, the XHR object, etc.
   * @property response
   * @type SolidResponse
   */
  this.response = response
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
    this.initWebId(parsedProfile)
    this.appendFromGraph(parsedProfile, this.baseProfileUrl)
  }
}

/**
 * Update the profile based on a parsed graph, which can be either the
 * initial WebID profile, or the various extended profile graphs
 * (such as the seeAlso, sameAs and preferences links)
 * @method appendFromGraph
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 * @param profileUrl {String} URL of this particular parsed graph
 */
SolidProfile.prototype.appendFromGraph =
  function appendFromGraph (parsedProfile, profileUrl) {
    if (!parsedProfile) {
      return
    }
    this.parsedGraph = this.parsedGraph || rdf.graph()  // initialize if null
    // Add the graph of this parsedProfile to the existing graph
    graphUtil.appendGraph(this.parsedGraph, parsedProfile, profileUrl)

    var webId = rdf.sym(this.webId)
    var links

    // Add sameAs and seeAlso
    links = parseLinks(parsedProfile, null, vocab.owl('sameAs'))
    this.relatedProfiles.sameAs = this.relatedProfiles.sameAs.concat(links)

    links = parseLinks(parsedProfile, null, vocab.rdfs('seeAlso'))
    this.relatedProfiles.seeAlso = this.relatedProfiles.seeAlso.concat(links)

    // Add preferencesFile link (singular). Note that preferencesFile has
    // Write-Once semantics -- it's initialized from public profile, but
    // cannot be overwritten by related profiles
    if (!this.preferences.uri) {
      this.preferences.uri = parseLink(parsedProfile, webId,
        vocab.pim('preferencesFile'))
    }
    // Init inbox (singular). Note that inbox has
    // Write-Once semantics -- it's initialized from public profile, but
    // cannot be overwritten by related profiles
    if (!this.inbox.uri) {
      this.inbox.uri = parseLink(parsedProfile, webId,
        vocab.solid('inbox'))
    }

    // Add storage
    links = parseLinks(parsedProfile, webId, vocab.pim('storage'))
    this.storage =
      this.storage.concat(links)

    // Add typeIndexes. Note: these are just the links to both public and
    // private indexes. The actual index files will be loaded and parsed
    //   in `Solid.identity.loadTypeRegistry()`)
    links = parseLinks(parsedProfile, webId, vocab.solid('typeIndex'))
    this.typeIndexes =
      this.typeIndexes.concat(links)
  }

/**
 * Extracts the WebID from a parsed profile graph and initializes it.
 * Should only be done once (when creating a new SolidProfile instance)
 * @method initWebId
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 */
SolidProfile.prototype.initWebId = function initWebId (parsedProfile) {
  if (!parsedProfile) {
    return
  }
  try {
    this.webId = extractWebId(this.baseProfileUrl, parsedProfile).uri
  } catch (e) {
    throw new Error('Unable to parse WebID from profile')
  }
}

/**
 * Returns an array of related external profile links (sameAs and seeAlso and
 * Preferences files)
 * @method relatedProfilesLinks
 * @return {Array<String>}
 */
SolidProfile.prototype.relatedProfilesLinks = function relatedProfilesLinks () {
  var links = []
  links = links.concat(this.relatedProfiles.sameAs)
    .concat(this.relatedProfiles.seeAlso)
  if (this.preferences.uri) {
    links = links.concat(this.preferences.uri)
  }
  return links
}

/**
 * Returns true if the profile has any links to root storage
 * @method hasStorage
 * @return {Boolean}
 */
SolidProfile.prototype.hasStorage = function hasStorage () {
  return this.storage &&
    this.storage.length > 0
}

/**
 * Convenience method to load the type index registry. Usage:
 *
 *   ```
 *   Solid.getProfile(url, options)
 *     .then(function (profile) {
 *       return profile.loadTypeRegistry(options)
 *     })
 *   ```
 * @method loadTypeRegistry
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {SolidProfile}
 */
SolidProfile.prototype.loadTypeRegistry = function loadTypeRegistry (options) {
  return identity.loadTypeRegistry(this, options)
}

/**
 * Adds a parsed type index graph to the appropriate type registry (public
 *   or private).
 * @method addTypeRegistry
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 */
SolidProfile.prototype.addTypeRegistry = function addTypeRegistry (graph) {
  // Is this a public type registry?
  if (identity.isPublicTypeIndex(graph)) {
    if (!this.typeIndexPublic.graph) {  // only initialize once
      this.typeIndexPublic.uri = graph.uri
      this.typeIndexPublic.graph = graph
    }
  } else if (identity.isPrivateTypeIndex(graph)) {
    if (!this.typeIndexPrivate.graph) {
      this.typeIndexPrivate.uri = graph.uri
      this.typeIndexPrivate.graph = graph
    }
  } else {
    throw new Error('Attempting to add an invalid type registry index')
  }
}

/**
 * Returns lists of registry entries for a given RDF Class, separated by
 * public or private. Usage:
 *
 * ```
 * profile.typeRegistryForClass(vocab.vcard('AddressBook'))  // result:
 * {
 *   public: [ array of triples (solid:instance or solid:instanceContainer) ],
 *   private: [ array of triples (same) ]
 * }
 * ```
 * @method typeRegistryForClass
 * @param rdfClass {rdf.Symbol} RDF Class symbol
 * @return {Object}
 */
SolidProfile.prototype.typeRegistryForClass =
  function typeRegistryForClass (rdfClass) {
    return {
      public: this.typeIndexPublic.graph
        .statementsMatching(null, null, rdfClass),
      private: this.typeIndexPrivate.graph
        .statementsMatching(null, null, rdfClass)
    }
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
  var pred = vocab.foaf('primaryTopic')
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
