'use strict'
/**
 * @module container
 */
module.exports = SolidContainer
var rdf = require('../util/rdf-parser').rdflib
var graphUtil = require('../util/graph-util')
var parseLinks = graphUtil.parseLinks
var vocab = require('../vocab')
var SolidResource = require('./resource')

/**
 * @class SolidContainer
 * @extends SolidResource
 * @constructor
 * @param uri {String}
 * @param response {SolidResponse}
 */
function SolidContainer (uri, response) {
  // Call parent constructor
  SolidResource.call(this, uri, response)

  /**
   * Hashmap of Containers within this container, keyed by absolute uri
   * @property containers
   * @type Object
   */
  this.containers = {}
  /**
   * List of URIs of all contents (containers and resources)
   * @property contentsUris
   * @type Array<String>
   */
  this.contentsUris = []

  /**
   * Hashmap of Contents that are just resources (not containers),
   * keyed by absolute uri
   * @property resources
   * @type Object
   */
  this.resources = {}

  if (response) {
    this.initFromResponse(this.uri, response)
  }
}
// SolidContainer.prototype object inherits from SolidResource.prototype
SolidContainer.prototype = Object.create(SolidResource.prototype)
SolidContainer.prototype.constructor = SolidContainer

/**
 * Extracts the contents (resources and sub-containers)
 * of the given graph and adds them to this container
 * @method appendFromGraph
 * @param parsedGraph {Graph}
 * @param graphUri {String}
 */
SolidContainer.prototype.appendFromGraph =
  function appendFromGraph (parsedGraph, graphUri) {
    // Set this container's types
    this.types = Object.keys(parsedGraph.findTypeURIs(rdf.sym(this.uri)))

    // Extract all the contents links (resources and containers)
    var contentsUris = parseLinks(parsedGraph, null, vocab.ldp('contains'))
    this.contentsUris = this.contentsUris.concat(contentsUris.sort())

    // Extract links that are just containers
    var containersLinks = parsedGraph.each(null, null, vocab.ldp('Container'))
    var self = this
    var container
    containersLinks.forEach(function (containerLink) {
      // Filter out . (the link to this directory)
      if (containerLink.uri !== self.uri) {
        container = new SolidContainer(containerLink.uri)
        container.types = Object.keys(parsedGraph.findTypeURIs(containerLink))
        self.containers[container.uri] = container
      }
    })
    // Now that containers are defined, all the rest are non-container resources
    var isResource
    var isContainer
    var resource
    contentsUris.forEach(function (link) {
      isContainer = link in self.containers
      isResource = link !== self.uri && !isContainer
      if (isResource) {
        resource = new SolidResource(link)
        resource.types = Object.keys(parsedGraph.findTypeURIs(rdf.sym(link)))
        self.resources[link] = resource
      }
    })
  }

/**
 * Returns a list of SolidResource or SolidContainer instances that match
 * a given type.
 * @method findByType
 * @param rdfClass {String}
 * @return {Array<SolidResource|SolidContainer>}
 */
SolidContainer.prototype.findByType = function findByType (rdfClass) {
  var matches = []
  var key
  var container
  for (key in this.containers) {
    container = this.containers[key]
    if (container.isType(rdfClass)) {
      matches.push(container)
    }
  }
  var resource
  for (key in this.resources) {
    resource = this.resources[key]
    if (resource.isType(rdfClass)) {
      matches.push(resource)
    }
  }
  return matches
}

/**
 * @method initFromResponse
 * @param uri {String}
 * @param response {SolidResponse}
 */
SolidContainer.prototype.initFromResponse =
  function initFromResponse (uri, response) {
    var contentType = response.contentType()
    if (!contentType) {
      throw new Error('Cannot parse container without a Content-Type: header')
    }
    var parsedGraph = graphUtil.parseGraph(uri, response.raw(),
      contentType)
    this.parsedGraph = parsedGraph
    this.appendFromGraph(parsedGraph, uri)
  }

/**
 * Is this a Container instance (vs a regular resource).
 * @return {Boolean}
 */
SolidResource.prototype.isContainer = function isContainer () {
  return true
}

/**
 * Returns true if there are no resources or containers inside this container.
 * @method isEmpty
 * @return {Boolean}
 */
SolidContainer.prototype.isEmpty = function isEmpty () {
  return this.contentsUris.length === 0
}

