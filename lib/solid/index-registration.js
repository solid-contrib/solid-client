'use strict'
/**
 * @module index-registration
 */
module.exports = IndexRegistration

/**
 * Represents a Solid Index registration (an entry in the Type Index Registry).
 * Returned in a list by `profile.typeRegistryForClass()`
 * @class IndexRegistration
 * @constructor
 * @param registrationUri {String} Absolute URI (with fragment identifier) of
 *   the registration (its location in the type index)
 * @param rdfClass {rdf.NamedNode} RDF Class for this registration
 * @param locationType {String} One of 'instance' or 'container'
 * @param locationUri {String} URI of the location containing resources of this
 *   type
 * @param accessLevel {String} One of 'listed' or 'unlisted'
 */
function IndexRegistration (registrationUri, rdfClass, locationType,
                            locationUri, accessLevel) {
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
   * URI of the solid instance or container that holds resources of this type
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
   * @property registrationUri
   * @type String
   */
  this.registrationUri = registrationUri
}

/**
 * Convenience method, returns true if this registration is of type
 * `solid:instanceContainer`
 * @method isContainer
 * @returns {Boolean}
 */
IndexRegistration.prototype.isContainer = function isInstance () {
  return this.locationType === 'container'
}

/**
 * Convenience method, returns true if this registration is of type
 * `solid:instance`
 * @method isInstance
 * @returns {Boolean}
 */
IndexRegistration.prototype.isInstance = function isInstance () {
  return this.locationType === 'instance'
}
