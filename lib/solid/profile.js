'use strict'
/**
 * @module profile
 */
module.exports = SolidProfile
var rdf = require('../util/rdf-parser').rdflib
var vocab = require('../vocab')
var typeRegistry = require('../type-registry')
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
   * Listed (public) Type registry index (link and parsed graph)
   * @property typeIndexListed
   * @type Object
   */
  this.typeIndexListed = {
    uri: null,
    graph: null
  }
  /**
   * Unlisted (private) Type registry index (link and parsed graph)
   * @property typeIndexUnlisted
   * @type rdf.Object
   */
  this.typeIndexUnlisted = {
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

    // Add links to Listed and Unlisted Type Indexes.
    // Note: these are just the links.
    // The actual index files will be loaded and parsed
    //   in `profile.loadTypeRegistry()`)
    if (!this.typeIndexListed.uri) {
      this.typeIndexListed.uri = parseLink(parsedProfile, webId,
        vocab.solid('publicTypeIndex'))
    }
    if (!this.typeIndexUnlisted.uri) {
      this.typeIndexUnlisted.uri = parseLink(parsedProfile, webId,
        vocab.solid('privateTypeIndex'))
    }
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
    throw new Error('Unable to parse WebID from profile: ' + e)
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
  return typeRegistry.loadTypeRegistry(this, options)
}

/**
 * Adds a parsed type index graph to the appropriate type registry (public
 *   or private).
 * @method addTypeRegistry
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @param uri {String} Location of the type registry index document
 */
SolidProfile.prototype.addTypeRegistry = function addTypeRegistry (graph, uri) {
  // Is this a public type registry?
  if (typeRegistry.isListedTypeIndex(graph)) {
    if (!this.typeIndexListed.graph) {  // only initialize once
      this.typeIndexListed.uri = uri
      this.typeIndexListed.graph = graph
    }
  } else if (typeRegistry.isUnlistedTypeIndex(graph)) {
    if (!this.typeIndexUnlisted.graph) {
      this.typeIndexUnlisted.uri = uri
      this.typeIndexUnlisted.graph = graph
    }
  } else {
    throw new Error('Attempting to add an invalid type registry index')
  }
}

/**
 * Returns lists of registry entries for a given RDF Class.
 * @method typeRegistryForClass
 * @param rdfClass {rdf.NamedNode} RDF Class symbol
 * @return {Array<IndexRegistration>}
 */
SolidProfile.prototype.typeRegistryForClass =
  function typeRegistryForClass (rdfClass) {
    return typeRegistry.typeRegistryForClass(this, rdfClass)
  }

/**
 * Registers a given RDF class in the user's type index registries, so that
 * other applications can discover it.
 * @method registerType
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param location {String} Absolute URI to the location you want the class
 *   registered to. (Example: Registering Address books in
 *   `https://example.com/contacts/`)
 * @param [locationType='container'] {String} Either 'instance' or 'container',
 *   defaults to 'container'
 * @param [isListed=false] {Boolean} Whether to register in a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.registerType =
  function (rdfClass, location, locationType, isListed) {
    return typeRegistry.registerType(this, rdfClass, location, locationType,
      isListed)
  }

/**
 * Removes a given RDF class from the user's type index registry
 * @method unregisterType
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param [isListed=false] {Boolean} Whether to register in a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.unregisterType = function (rdfClass, isListed, location) {
  return typeRegistry.unregisterType(this, rdfClass, isListed, location)
}

/**
 * Extracts the WebID symbol from a parsed profile graph.
 * @method extractWebId
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 * @return {rdf.NamedNode} WebID symbol
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
 * @param subject {rdf.NamedNode}
 * @param predicate {rdf.NamedNode}
 * @param object {rdf.NamedNode}
 * @param source {rdf.NamedNode}
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
