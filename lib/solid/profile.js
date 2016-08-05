'use strict'
/**
 * @module profile
 */
module.exports = SolidProfile

var appRegistry = require('../app-registry')
var vocab = require('solid-namespace')
var registry = require('../registry')
var typeRegistry = require('../type-registry')
var graphUtil = require('../util/graph-util')
var parseLinks = graphUtil.parseLinks

var PREFERENCES_DEFAULT_URI = '/settings/prefs.ttl'
var PROFILE_CONTAINER_DEFAULT_URI = '/profile/'

/**
 * Provides convenience methods for a WebID Profile.
 * Used by `identity.getProfile()`
 * @class SolidProfile
 * @constructor
 */
function SolidProfile (profileUrl, parsedProfile, rdf, webClient, response) {
  /**
   * Listed (public) App Registry (link and parsed graph)
   * @property appRegistryListed
   * @type Object
   */
  this.appRegistryListed = {
    uri: null,
    graph: null
  }
  /**
   * Unlisted (private) App Registry (link and parsed graph)
   * @property appRegistryUnlisted
   * @type Object
   */
  this.appRegistryUnlisted = {
    uri: null,
    graph: null
  }
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
   * Profile owner's avatar / icon url. (Initialized in .appendFromGraph())
   * @type String
   */
  this.picture = null
  /**
   * Profile owner's name. (Initialized in .appendFromGraph())
   * @property name
   * @type String
   */
  this.name = null
  /**
   * RDF Library used by find(), parsedGraph(), etc.
   * @property rdf
   * @type RDF
   */
  this.rdf = rdf
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
   * @type Object
   */
  this.typeIndexUnlisted = {
    uri: null,
    graph: null
  }
  /**
   * Parsed graph of the extended WebID Profile document.
   * Included the WebID profile, preferences, and related profile graphs
   * @property parsedGraph
   * @type Graph
   */
  this.parsedGraph = null
  /**
   * Profile preferences object (link and parsed graph).
   * Currently used as a 'Private Profile', and is part of the Extended Profile.
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
  /**
   * Web client (for use with loadProfile() etc)
   * @type SolidWebClient
   */
  this.webClient = webClient

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
 * @private
 * @param parsedProfile {Graph} RDFLib-parsed user profile
 * @param profileUrl {String} URL of this particular parsed graph
 */
SolidProfile.prototype.appendFromGraph =
  function appendFromGraph (parsedProfile, profileUrl) {
    if (!parsedProfile) {
      return
    }
    var rdf = this.rdf
    var ns = vocab(rdf)
    this.parsedGraph = this.parsedGraph || rdf.graph()  // initialize if null
    // Add the graph of this parsedProfile to the existing graph
    graphUtil.appendGraph(this.parsedGraph, parsedProfile, profileUrl)

    var webId = rdf.namedNode(this.webId)
    var links

    // Load the profile owner's name and avatar/icon url
    if (!this.name) {
      this.name = this.find(ns.foaf('name'))
    }
    if (!this.picture) {
      this.picture = this.find(ns.foaf('img'))
    }
    // Add sameAs and seeAlso
    links = parseLinks(parsedProfile, null, ns.owl('sameAs'))
    this.relatedProfiles.sameAs = this.relatedProfiles.sameAs.concat(links)

    links = parseLinks(parsedProfile, null, ns.rdfs('seeAlso'))
    this.relatedProfiles.seeAlso = this.relatedProfiles.seeAlso.concat(links)

    // Add preferencesFile link (singular). Note that preferencesFile has
    // Write-Once semantics -- it's initialized from public profile, but
    // cannot be overwritten by related profiles
    if (!this.preferences.uri) {
      this.preferences.uri = parseLink(parsedProfile, webId,
        ns.pim('preferencesFile'))
    }
    // Init inbox (singular). Note that inbox has
    // Write-Once semantics -- it's initialized from public profile, but
    // cannot be overwritten by related profiles
    if (!this.inbox.uri) {
      this.inbox.uri = parseLink(parsedProfile, webId,
        ns.solid('inbox'))
    }

    // Add storage
    links = parseLinks(parsedProfile, webId, ns.pim('storage'))
    this.storage =
      this.storage.concat(links)

    // Add links to Listed and Unlisted Type Indexes.
    // Note: these are just the links.
    // The actual index files will be loaded and parsed
    //   in `profile.loadTypeRegistry()`)
    if (!this.typeIndexListed.uri) {
      this.typeIndexListed.uri = parseLink(parsedProfile, webId,
        ns.solid('publicTypeIndex'))
    }
    if (!this.typeIndexUnlisted.uri) {
      this.typeIndexUnlisted.uri = parseLink(parsedProfile, webId,
        ns.solid('privateTypeIndex'))
    }

    // Add links to Listed and Unlisted App Registry resources.
    // Note: these are just the links.
    // The actual index files will be loaded and parsed
    //   in `profile.loadAppRegistry()`)
    if (!this.appRegistryListed.uri) {
      this.appRegistryListed.uri = parseLink(parsedProfile, webId,
        ns.solid('publicAppRegistry'))
    }
    if (!this.appRegistryUnlisted.uri) {
      this.appRegistryUnlisted.uri = parseLink(parsedProfile, webId,
        ns.solid('privateAppRegistry'))
    }
  }

/**
 * Returns the default location of the container in which the App Registry
 * resources will reside. (Uses the same container as the profile
 * document.)
 * @method appRegistryDefaultContainer
 * @return {String}
 */
SolidProfile.prototype.appRegistryDefaultContainer =
  function appRegistryDefaultContainer () {
    var profileUri = this.webId || this.baseProfileUrl
    var baseContainer
    if (profileUri) {
      baseContainer = profileUri.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '') + '/'
    } else {
      baseContainer = PROFILE_CONTAINER_DEFAULT_URI
    }
    return baseContainer
  }

/**
 * Returns a list of registry entries for a given RDF Class.
 * @method appsForType
 * @param type {NamedNode} RDF Class
 * @return {Array<AppRegistration>}
 */
SolidProfile.prototype.appsForType = function appsForType (type) {
  return appRegistry.appsForType(this, type, this.rdf)
}

/**
 * Returns the value of a given "field" (predicate) from the profile's parsed
 * graph. If there are more than one matches for this predicate, .find()
 * returns the first one. If there are no matches, `null` is returned.
 * Usage:
 *
 *   ```
 *   var inboxUrl = profile.find(ns.solid('inbox'))
 *   if (inboxUrl) {
 *     console.log('Inbox is located at:', inboxUrl)
 *   }
 *   ```
 * @method find
 * @param predicate {NamedNode} RDF named node of the predicate
 * @return {String|Null} String value (or uri)
 */
SolidProfile.prototype.find = function find (predicate) {
  if (!this.parsedGraph) {
    throw new Error('Profile graph not yet loaded.')
  }
  var subject = this.rdf.namedNode(this.webId)
  var result = this.parsedGraph.any(subject, predicate)
  if (!result) {
    return result
  }
  return result.value || result.uri
}

/**
 * Returns all values of a given "field" (predicate) from the profile's parsed
 * graph.
 * Usage:
 *
 *   ```
 *   var related = profile.findAll(vocab.owl('sameAs'))
 *   ```
 * @method findAll
 * @param predicate {NamedNode} RDF named node of the predicate
 * @return {Array<String>} Array of string values/uris
 */
SolidProfile.prototype.findAll = function findAll (predicate) {
  if (!this.parsedGraph) {
    throw new Error('Profile graph not yet loaded.')
  }
  var subject = this.rdf.namedNode(this.webId)
  var matches = this.parsedGraph.statementsMatching(subject, predicate)
  matches = matches.map(function (ea) {
    return ea.object.value || ea.object.uri
  })
  return matches.sort()
}

/**
 * Extracts the WebID from a parsed profile graph and initializes it.
 * Should only be done once (when creating a new SolidProfile instance)
 * @method initWebId
 * @param parsedProfile {Graph} RDFLib-parsed user profile
 */
SolidProfile.prototype.initWebId = function initWebId (parsedProfile) {
  if (!parsedProfile) {
    return
  }
  try {
    this.webId = extractWebId(this.baseProfileUrl, parsedProfile,
      this.rdf).uri
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
 * Returns whether or not the profile has a private (unlisted) App Registry
 * associated with it (linked to from the profile document).
 * @method hasAppRegistryPrivate
 * @throws {Error} If the profile has not been loaded (via getProfile()).
 * @return {Boolean} Returns truthy value if the private (unlisted) app registry
 *   exists (that is, has a link in the profile).
 */
SolidProfile.prototype.hasAppRegistryPrivate =
  function hasAppRegistryPrivate () {
    if (!this.isLoaded) {
      throw new Error('Must load profile before checking if registry exists.')
    }
    return this.appRegistryUnlisted.uri
  }

/**
 * Returns whether or not the profile has a public (listed) App Registry
 * associated with it (linked to from the profile document).
 * @method hasAppRegistryPublic
 * @throws {Error} If the profile has not been loaded (via getProfile()).
 * @return {Boolean} Returns truthy value if the public (listed) app registry
 *   exists (that is, has a link in the profile).
 */
SolidProfile.prototype.hasAppRegistryPublic =
  function hasAppRegistryPublic () {
    if (!this.isLoaded) {
      throw new Error('Must load profile before checking if registry exists.')
    }
    return this.appRegistryListed.uri
  }

/**
 * Returns true if the profile has any links to root storage
 * @method hasStorage
 * @return {Boolean}
 */
SolidProfile.prototype.hasStorage = function hasStorage () {
  return this.storage && this.storage.length > 0
}

/**
 * Returns whether or not the profile has a private (unlisted) Type Index
 * Registry associated with it (linked to from the profile document).
 * @method hasTypeRegistryPrivate
 * @throws {Error} If the profile has not been loaded (via getProfile()).
 * @return {Boolean} Returns truthy value if the private (unlisted) type index
 *   registry exists (that is, has a link in the profile).
 */
SolidProfile.prototype.hasTypeRegistryPrivate =
  function hasTypeRegistryPrivate () {
    if (!this.isLoaded) {
      throw new Error('Must load profile before checking if registry exists.')
    }
    return this.typeIndexUnlisted.uri
  }

/**
 * Returns whether or not the profile has a public (listed) Type Index Registry
 * associated with it (linked to from the profile document).
 * @method hasTypeRegistryPublic
 * @throws {Error} If the profile has not been loaded (via getProfile()).
 * @return {Boolean} Returns truthy value if the public (listed) type index
 *   registry exists (that is, has a link in the profile).
 */
SolidProfile.prototype.hasTypeRegistryPublic =
  function hasTypeRegistryPublic () {
    if (!this.isLoaded) {
      throw new Error('Must load profile before checking if registry exists.')
    }
    return this.typeIndexListed.uri
  }

/**
 * Convenience method to load the app registry. Usage:
 *
 *   ```
 *   Solid.getProfile(url, options)
 *     .then(function (profile) {
 *       return profile.loadAppRegistry(webClient, options)
 *     })
 *   ```
 * @method loadAppRegistry
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.loadAppRegistry =
  function loadAppRegistry (webClient, options) {
  webClient = webClient || this.webClient
    return appRegistry.loadAppRegistry(this, webClient, options)
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
 * @param webClient {SolidWebClient}
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.loadTypeRegistry =
  function loadTypeRegistry (webClient, options) {
    webClient = webClient || this.webClient
    return typeRegistry.loadTypeRegistry(this, webClient, options)
  }

/**
 * Adds a parsed app registry graph to the appropriate registry (public
 *   or private). (Used when parsing the extended profile).
 * @method addAppRegistry
 * @private
 * @param graph {Graph} Parsed graph (loaded from an app registry resource)
 * @param uri {String} Location of the app registry document
 */
SolidProfile.prototype.addAppRegistry = function addAppRegistry (graph, uri) {
  // Is this a public app registry?
  if (registry.isListed(graph, this.rdf)) {
    if (!this.appRegistryListed.graph) {  // only initialize once
      this.appRegistryListed.uri = uri
      this.appRegistryListed.graph = graph
    }
  } else if (registry.isUnlisted(graph, this.rdf)) {
    if (!this.appRegistryUnlisted.graph) {
      this.appRegistryUnlisted.uri = uri
      this.appRegistryUnlisted.graph = graph
    }
  } else {
    console.log(graph)
    throw new Error('Attempting to add an invalid app registry resource')
  }
}

/**
 * Adds a parsed type index graph to the appropriate type registry (public
 *   or private). (Used when parsing the extended profile).
 * @method addTypeRegistry
 * @private
 * @param graph {Graph} Parsed graph (loaded from a type index
 *   resource)
 * @param uri {String} Location of the type registry index document
 */
SolidProfile.prototype.addTypeRegistry =
  function addTypeRegistry (graph, uri) {
    // Is this a public type registry?
    if (registry.isListed(graph, this.rdf)) {
      if (!this.typeIndexListed.graph) {  // only initialize once
        this.typeIndexListed.uri = uri
        this.typeIndexListed.graph = graph
      }
    } else if (registry.isUnlisted(graph, this.rdf)) {
      if (!this.typeIndexUnlisted.graph) {
        this.typeIndexUnlisted.uri = uri
        this.typeIndexUnlisted.graph = graph
      }
    } else {
      throw new Error('Attempting to add an invalid type registry index')
    }
  }

/**
 * Reloads the contents of the profile's App Registry resources.
 * @method reloadAppRegistry
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.reloadAppRegistry =
  function reloadAppRegistry (webClient) {
    this.resetAppRegistry()
    return this.loadAppRegistry(webClient)
  }

/**
 * Reloads the contents of the profile's Type Index registries.
 * @method reloadTypeRegistry
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.reloadTypeRegistry =
  function reloadTypeRegistry (webClient) {
    this.resetTypeRegistry()
    return this.loadTypeRegistry(webClient)
  }

/**
 * Resets the contents (graphs) of the profile's App Registry resources to null.
 * Used internally by `reloadAppRegistry()`.
 * @method resetAppRegistry
 * @private
 */
SolidProfile.prototype.resetAppRegistry = function resetAppRegistry () {
  this.appRegistryListed.graph = null
  this.appRegistryUnlisted.graph = null
}

/**
 * Resets the contents (graphs) of the profile's Type Index registries to null.
 * Used internally by `reloadTypeRegistry()`.
 * @method resetTypeRegistry
 * @private
 */
SolidProfile.prototype.resetTypeRegistry = function resetTypeRegistry () {
  this.typeIndexListed.graph = null
  this.typeIndexUnlisted.graph = null
}

/**
 * Returns lists of registry entries for a given RDF Class.
 * @method typeRegistryForClass
 * @param rdfClass {rdf.NamedNode} RDF Class symbol
 * @return {Array<IndexRegistration>}
 */
SolidProfile.prototype.typeRegistryForClass =
  function typeRegistryForClass (rdfClass) {
    return typeRegistry.typeRegistryForClass(this, rdfClass, this.rdf)
  }

/**
 * Returns the default location of the container in which the Type Registry
 * Index resources will reside. (Uses the same container as the profile
 * document.)
 * @method typeRegistryDefaultContainer
 * @return {String}
 */
SolidProfile.prototype.typeRegistryDefaultContainer =
  function typeRegistryDefaultContainer () {
    var profileUri = this.webId || this.baseProfileUrl
    var baseContainer
    if (profileUri) {
      baseContainer = profileUri.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '') + '/'
    } else {
      baseContainer = PROFILE_CONTAINER_DEFAULT_URI
    }
    return baseContainer
  }

/**
 * Returns the relative URL of the private profile (preferences) resource.
 * @method privateProfileUri
 * @return {String}
 */
SolidProfile.prototype.privateProfileUri = function privateProfileUri () {
  if (this.preferences && this.preferences.uri) {
    return this.preferences.uri
  } else {
    return PREFERENCES_DEFAULT_URI
  }
}

/**
 * Registers a given entry in the app registry.
 * @method registerApp
 * @param app {AppRegistration}
 * @return {Promise<SolidProfile>} Returns updated profile.
 */
SolidProfile.prototype.registerApp = function registerApp (app, webClient) {
  webClient = webClient || this.webClient
  return appRegistry.registerApp(this, app, webClient)
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
  function registerType (rdfClass, location, locationType, isListed) {
    return typeRegistry.registerType(this, rdfClass, location, locationType,
      isListed, this.webClient)
  }

/**
 * Removes a given RDF class from the user's type index registry
 * @method unregisterType
 * @param rdfClass {NamedNode} Type to register in the index.
 * @param [isListed=false] {Boolean} Whether to register in a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.unregisterType =
  function unregisterType (rdfClass, isListed, location) {
    return typeRegistry.unregisterType(this, rdfClass, isListed, location,
      this.webClient)
  }

/**
 * Extracts the WebID symbol from a parsed profile graph.
 * @method extractWebId
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {Graph} RDFLib-parsed user profile
 * @return {NamedNode} WebID symbol
 */
function extractWebId (baseProfileUrl, parsedProfile, rdf) {
  var ns = vocab(rdf)
  var subj = rdf.namedNode(baseProfileUrl)
  var pred = ns.foaf('primaryTopic')
  var match = parsedProfile.any(subj, pred)
  return match
}

/**
 * Extracts the first URI from a parsed graph that matches parameters
 * @method parseLinks
 * @param graph {Graph}
 * @param subject {NamedNode}
 * @param predicate {NamedNode}
 * @param object {NamedNode}
 * @param source {NamedNode}
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
