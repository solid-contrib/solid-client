'use strict'

// Get current online status
var isOnline = function isOnline () {
  return window.navigator.onLine
}

// Is offline
var onOffline = function onOffline (callback) {
  window.addEventListener('offline', callback, false)
}

// Trigger when user comes online
var onOnline = function onOnline (callback) {
  window.addEventListener('online', callback, false)
}

// Events
module.exports.isOnline = isOnline
module.exports.onOffline = onOffline
module.exports.onOnline = onOnline
