'use strict'
/**
 * Provides miscelaneous meta functions (such as library version)
 * @module meta
 */
var lib = require('../package')

/**
 * Returns Solid.js library version (read from `package.json`)
 * @return {String} Lib version
 */
module.exports.version = function version () {
  return lib.version
}
