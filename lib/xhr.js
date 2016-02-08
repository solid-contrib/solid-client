'use strict'
/**
 * Provides a generic wrapper around the XMLHttpRequest object, to make it
 * usable both in the browser and in Node.js
 * @module xhr
 */
var XMLHttpRequest
if (window !== undefined && 'XMLHttpRequest' in window) {
  // Running inside the browser
  XMLHttpRequest = window.XMLHttpRequest
} else {
  // in Node.js
  XMLHttpRequest = require('xhr2')
}

module.exports = XMLHttpRequest
