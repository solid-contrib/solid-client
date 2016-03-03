'use strict'
/**
 * Provides functions to normalize a Solid WebID Profile according to spec.
 * @module normalize-profile
 */
module.exports.createPreferences = createPreferences

/**
 * @method createPreferences
 * @param profile {SolidProfile} Loaded WebID profile
 */
function createPreferences (profile) {
  if (!profile || !profile.isLoaded) {
    throw new Error('Loaded profile required')
  }
  if (profile.preferences()) {
    // Preferences link exists, check to see if
  }
}
