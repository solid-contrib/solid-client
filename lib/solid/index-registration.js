'use strict'
/**
 * @module index-registration
 */

/**
 * Represents a Solid Index registration (an entry in the Type Index Registry)
 * @class IndexRegistration
 * @constructor
 * @param uri {String} Absolute URI (with fragment identifier) of the
 *   registration
 * @param rdfClass {rdf.NamedNode} RDF Class for this registration
 * @param locationType {String} One of 'instance' or 'container'
 * @param locationUri {String} URI of the location for this class
 * @param accessLevel {String} One of 'listed' or 'unlisted'
 */
module.exports = IndexRegistration

function IndexRegistration (uri, rdfClass, locationType, locationUri,
                            accessLevel) {
  /**
   * Is this a listed or unlisted registration
   * @property isListed
   * @type Boolean
   */
  if (accessLevel === 'listed') {
    this.isListed = true
  } else if (accessLevel === 'unlisted') {
    this.isListed = false
  } else {
    throw new Error('Invalid listed/unlisted access level: ' + accessLevel)
  }
  /**
   * Location type, one of 'instance' or 'container'
   * @property locationType
   * @type String
   */
  this.locationType = locationType
  /**
   * URI of the solid instance or container for this class
   * @property locationUri
   * @type String
   */
  this.locationUri = locationUri
  /**
   * RDF Class for this registration
   * @property rdfClass
   * @type rdf.NamedNode
   */
  this.rdfClass = rdfClass
  /**
   * Absolute URI (with fragment identifier) of the registration
   * @property uri
   * @type String
   */
  this.uri = uri
}
