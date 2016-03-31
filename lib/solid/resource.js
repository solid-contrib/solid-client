'use strict'
/**
 * @module resource
 */

/**
 * Represents a Solid / LDP Resource (currently used when listing
 * SolidContainer resources)
 * @class SolidResource
 * @constructor
 */
module.exports = SolidResource

function SolidResource (uri, response) {
  /**
   * Short name (page/filename part of the resource path),
   * derived from the URI
   * @property name
   * @type String
   */
  this.name = null
  /**
   * Parsed graph of the contents of the resource
   * @property parsedGraph
   * @type Graph
   */
  this.parsedGraph = null
  /**
   * Optional SolidResponse object from which this resource was initialized
   * @property response
   * @type SolidResponse
   */
  this.response = response
  /**
   * List of RDF Types (classes) to which this resource belongs
   * @property types
   * @type Array<String>
   */
  this.types = []
  /**
   * Absolute url of the resource
   * @property url
   * @type String
   */
  this.uri = uri

  if (response) {
    if (response.url !== uri) {
      // Override the given url (which may be relative) with that of the
      // response object (which will be absolute)
      this.uri = response.url
    }
  }
  this.initName()
}

/**
 * Initializes the short name from the url
 * @method initName
 */
SolidResource.prototype.initName = function initName () {
  if (!this.uri) {
    return
  }
  // Split on '/', use the last fragment
  var fragments = this.uri.split('/')
  this.name = fragments.pop()
  if (!this.name && fragments.length > 0) {
    // URI ended in a '/'. Try again.
    this.name = fragments.pop()
  }
}

/**
 * Is this a Container instance (vs a regular resource).
 * (Is overridden in the subclass, `SolidContainer`)
 * @return {Boolean}
 */
SolidResource.prototype.isContainer = function isContainer () {
  return false
}

/**
 * Returns true if this a given type matches this resource's types
 * @method isType
 * @param rdfClass {String}
 * @return {Boolean}
 */
SolidResource.prototype.isType = function isType (rdfClass) {
  return this.types.indexOf(rdfClass) !== -1
}
