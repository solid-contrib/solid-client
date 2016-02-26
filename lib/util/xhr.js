'use strict'
/* global Components */
/**
 * Provides a generic wrapper around the XMLHttpRequest object, to make it
 * usable both in the browser and firefox extension and in Node.js
 * @module xhr
 */
var XMLHttpRequest
if (typeof tabulator !== 'undefined' && tabulator.isExtension) {
  // Running inside the Tabulator Firefox extension
  // Cannot use XMLHttpRequest natively, must request it through SDK
  XMLHttpRequest = Components
    .classes['@mozilla.org/xmlextras/xmlhttprequest;1']
    .createInstance()
    .QueryInterface(Components.interfaces.nsIXMLHttpRequest)
} else if (typeof window !== 'undefined' && 'XMLHttpRequest' in window) {
  // Running inside the browser
  XMLHttpRequest = window.XMLHttpRequest
} else {
  // in Node.js
  XMLHttpRequest = require('xhr2')
}
module.exports = XMLHttpRequest
