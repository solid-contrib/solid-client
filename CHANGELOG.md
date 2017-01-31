##### Version 0.23.7
- Update solid-web-client to 0.2.0

##### Version 0.23.1
- Use newest rdflib v0.13.0

##### Version 0.23.0

- `getProfile()` now handles 30x redirects
- Fix response.url and Content-Type handling in `solid-web-client`

##### Version 0.22.5

- Misc. fixes and refactoring

##### Version 0.21.0
- Massive refactoring, extracting authentication, permissions and web client
  into standalone repositories
  ([`solid-auth-tls`](https://github.com/solid/solid-auth-tls),
  [`solid-web-client`](https://github.com/solid/solid-web-client),
  [`solid-permissions`](https://github.com/solid/solid-permissions) and
  [`solid-namespace`](https://github.com/solid/solid-namespace))
- **(breaking change)** Deprecated `solid.web.getParsedGraph()`. Use
  `solid.web.get().then(response => { return response.parsedGraph() })` instead.
- Added `profile.registerApp()` functionality (adds an app entry to the App
  Registry), and `profile.appsForType()` (queries for app registry entries for
  a given type).

##### Version 0.20.0
- Added `initTypeRegistry()` and `initAppRegistry()` functionality
- (**breaking change**) distribute two bundles as minified UMD modules.  One
  includes `rdflib` in the bundle, and one does not.  Clients using the bundles
  without a module bundler (e.g. referencing the library in `<script>` tags)
  should use the global `SolidClient` object.
- Fix `require('solid-client')` for client apps using a CommonJS module loader.

##### Version 0.19.0
- Refactored WebID discovery
- Added `profile.find()` and `profile.findAll()` helper methods
- Added profile fields `name` and `img` (parsed from graph automatically)

##### Version 0.18.0
- Implemented ACL/permission API support, `getPermission()` etc.

##### Version 0.17.0:
- Only package necessary files
- Document release process

##### Version 0.16.0:
- Distribute bundled lib as UMD module

##### Version 0.15.0:
- Added WebID discovery

##### Version 0.14.2:

- Expand `response.isContainer()` to also count `BasicContainer`
  link rel type (in addition to `Container`)

##### Version 0.14.1:

- Add `response.parsedGraph()` convenience method (for use with `web.get()`)

##### Version 0.14.0:

- Merge the `web.list()` functionality into `web.get()`. That is, if the result
  of a `get()` call is a Container, return an instance of `SolidContainer`
  (as if `web.list()` was called instead).
- Give a Deprecation warning on usage of `.list()`
- Add an `isContainer()` helper method to `SolidResponse` and `SolidContainer`.
- Give a Deprecation warning when `web.list()` is used.
- (**breaking change**) `response.type` is now response `.types` (plural),
  since Solid/LDP resources can have multiple types (for example, a Container
  is of type `http://www.w3.org/ns/ldp#Container` and
  `http://www.w3.org/ns/ldp#BasicContainer` both).
- Implemented `web.createContainer()` convenience method.

##### Version 0.13.0:

- Make `withCredentials` XHR parameter optional with `web.get()` (and other
  web requests). This is set by default, but can be suppressed with options.
  Usage: `solid.web.get(url, { noCredentials = true })`
- Implement `profile.unregisterType()`
- (**breaking change**) Changed signature of `profile.registerType()` to use
  a boolean `isListed` instead of string 'listed'/'unlisted'

##### Version 0.12.1:

- Fixed `web.patch()`-related issue that was blocking `profile.registerType()`

##### Version 0.12.0:

- Updated the `profile.loadTypeRegistry()` semantics to match the latest
  Data Discovery / Type Registry proposal.
- (**breaking change**) Renamed type index related properties and methods to
  match the proposal -- for example, `typeIndexListed` instead of
  `typeIndexPublic`.
- Implemented `profile.registerType()`

##### Version 0.11.1:

- Add a convenience method `solid.currentUser()`. See the README
  [Authentication section](README.md#authentication).

##### Version 0.11.0:

- (**breaking change**) Changed Preferences semantics -- a profile is allowed
  only one Preferences object. Removed `profile.preferences()` helper method.
  Usage is now: `profile.preferences.uri` (string uri) and
  `profile.preferences.graph` (parsed preferences graph, once profile is loaded)
- (**breaking change**) Removed `profile.inbox()` helper method.
  Usage is now: `profile.inbox.uri` (string uri) and
  `profile.inbox.graph` (parsed Inbox graph, once it's loaded). Note:
  the Inbox is not automatically loaded and parsed on `getProfile()`.
- (**breaking change**) Changed `profile.typeIndexPublic` and
  `profile.typeIndexPrivate` semantics -- they are each now write-once (like the
  preferences and inbox), instead of a list. Usage is now:
  `profile.typeIndexPrivate.uri` and `.graph`, and
  `profile.typeIndexPublic.uri` and `.graph`.
- (**breaking change**) Removed `profile.typeIndexes()` method, `typeIndexes` is
  now just an object property. New usage: `profile.typeIndexes`
- (**breaking change**) Removed `profile.storage()` method, root storage is now
  just an object property. New usage: `profile.storage`
- Added `profile.hasStorage()` convenience method -- returns true if the profile
  has a link to root storage.

##### Version 0.10.0:

- (**possibly breaking change** (if you were using the Vocab object))
  Switch to `npm-ns` based Namespace object for
  `lib/vocab.js`. Now usage is: `vocab.foaf('name')` instead of
  `rdf.sym(Vocab.FOAF.name)`.

##### Version 0.9.1:

- Misc bug fixes for loading extended profile logic (issues PR #54 and PR #55)

##### Version 0.9.0:

- Added convenience methods to load and query the Type Registry Index resources
  (see [PR #44](https://github.com/solid/solid.js/pull/44))
- Fixed preferences semantics -- now part of the `profile.relatedProfiles`,
  and auto-loaded on `getProfile()`
- Removed option to ignore extended profiles in `getProfile()` (not needed)
- Now exporting the main methods at the top module level, so that client code
  doesn't have to go through `Solid.identity` or `Solid.auth`.
  Non-breaking change -- the old methods will still work.
  New usage:
  * `Solid.login()` and `Solid.signup()`
  * `Solid.getProfile()`
- Implemented `solid.web.list()` container listing method.
- Added `SolidContainer` and `SolidResource` classes

##### Version 0.8.1:

- Added a `SolidProfile.response` property (contains the original
  `SolidResponse` instance from which the profile was parsed).

##### Version 0.8.0:

- Extract profile logic to its own class
- (**breaking change**) `Solid.identity.getProfile()` now returns a
  `SolidProfile` instance instead of a parsed graph. (The parsed graph can
  still be accessed at `profile.parsedGraph`).
- `getProfile()` now uses `Solid.web.get()` instead of RDFLib's Fetcher
- Apps can now load the extended profile (sameAs, seeAlso, etc) asynchronously,
  using `Solid.identity.loadExtendedProfile()`
- Add `profile.inbox()`, `.storage()`, `.preferences()` convenience methods

##### Version 0.7.0:

- (**breaking change**) Removed `Solid.identity.getWorkspaces` (no longer
  relevant) and `getWritableProfiles` (duplicate code to `getProfile`)
- Added TravisCI integration
- Add `Solid.web.options()` method
- Add support to `webUtil.parseAllowedMethods()` for
  `Access-Control-Allow-Methods` headers

##### Version 0.6.0:

- (**breaking change**) Rename export module name from `solid.js` to `solid`.
  Now usage is: `var Solid = require('solid')`
- (**breaking change**) Rename rdflib-based `get()` to `getParsedGraph()`,
  extract it to `./web-rdflib.js`
- (**breaking change**) `response.exists` is now `response.exists()`
- Extract XMLHttpRequest to its own module, `lib/xhr.js`
- Exclude `xhr2` from browserify build (since it's not needed in browser)
- Exclude `rdflib` from browserify build, explicitly
- Extract common XMLHttpRequest logic to `solidRequest()`
- Use XMLHttpRequest Level 2 semantics (`onload` instead of
  `onreadystatechange`) since they have been merged into XMLHttpRequest
  standard, and supported by all browsers
- Add a `config.js` (for things like proxy url, timeout, etc)
- Extract `web.js`/`parseResponseMeta()` to `solid-response.js`/`SolidResponse`
- Created `lib/vocab.js` to do rdflib-agnostic namespacing
- Refactored `lib/auth.js`, moved defaults to `config.js`
- Refactored `lib/identity.js` / `getProfile()`

##### Version 0.5.0:

 - Converted to JS Standard coding format
 - (**breaking change**) Converted structure to use Node.js require()
  and Browserify

##### Version 0.4.0:

 - Incorporating latest changes
 - removed acl.js until it's ready
 - Changed style of function definition
 - Update order or params for post()
 - Updated example

##### Version 0.3.4:

 - Improved docs

##### Version 0.3.3:

 - Improved docs
 - Sync with gh-pages

##### Version 0.3.2:

 - Fixed typos; improved text

##### Version 0.3.0:

 - Incorporating latest changes
 - Added getWritableProfiles() function; improvements to getProfile()
 - Added .editable property to meta object

##### Version 0.2.1:

 - Incorporating latest changes
 - Added withCredentials flag to head()
 - Removed debugging

##### Version 0.2.0:

 - Added patch support
 - Merge pull request #1 from solid/nicola-patch-1
 - Adding highlighting to javascript examples

##### Version 0.1.5:

 - Incorporating latest changes
 - Automatically commit the dist file

##### Version 0.1.4:

 - Added websocket to the meta object
 - Removed empty line

##### Version 0.1.3:

 - Switched to --follow-tags

##### Version 0.1.2:

 - Added push.sh
