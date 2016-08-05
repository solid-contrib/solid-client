'use strict'
/**
 * Provides a simple configuration object for Solid web client and other
 * modules.
 * @module config
 */
module.exports = {
  /**
   * Default authentication endpoint
   */
  authEndpoint: 'https://databox.me/',

  /**
   * Default signup endpoints (list of identity providers)
   */
  signupEndpoint: 'https://solid.github.io/solid-idps/',

  /**
   * Default height of the Signup popup window, in pixels
   */
  signupWindowHeight: 600,

  /**
   * Default width of the Signup popup window, in pixels
   */
  signupWindowWidth: 1024
}
