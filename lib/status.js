'use strict'
/**
 * Provides Web API helpers dealing with a user's online / offline status.
 * @module status
 */
module.exports.isOnline = isOnline
module.exports.onOffline = onOffline
module.exports.onOnline = onOnline

/**
 * Returns a user's online status (true if user is on line)
 * @method isOnline
 * @static
 * @return {Boolean}
 */
function isOnline () {
  return window.navigator.onLine
}

/**
 * Adds an even listener to trigger when the user goes offline.
 * @method onOffline
 * @static
 * @param callback {Function} Callback to invoke when user goes offline.
 */
function onOffline (callback) {
  window.addEventListener('offline', callback, false)
}

/**
 * Adds an even listener to trigger when the user comes online.
 * @method onOnline
 * @static
 * @param callback {Function} Callback to invoke when user comes online
 */
function onOnline (callback) {
  window.addEventListener('online', callback, false)
}
