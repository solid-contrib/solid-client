'use strict'
/**
 * Provides a Solid client helper object (which exposes various static modules).
 * @module solid.js
 * @main solid.js
 */

/**
 * @class Solid
 * @static
 */
var Solid = {
  auth: require('./lib/auth'),
  identity: require('./lib/identity'),
  meta: require('./lib/meta'),
  status: require('./lib/status'),
  web: require('./lib/web')
}

if (typeof tabulator !== 'undefined') {
  tabulator.solid = Solid
}

module.exports = Solid
