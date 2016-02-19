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
