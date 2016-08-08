# solid-client
[![](https://img.shields.io/badge/project-Solid-7C4DFF.svg?style=flat)](https://github.com/solid/solid)
[![NPM Version](https://img.shields.io/npm/v/solid-client.svg?style=flat)](https://npm.im/solid-client)
[![Build Status](https://travis-ci.org/solid/solid-client.svg?branch=master)](https://travis-ci.org/solid/solid-client)

Javascript library for writing [Solid](https://github.com/solid/solid)
applications. (See **[Changelog](CHANGELOG.md)** for version history.)

## Usage

The solid client can be used by solid applications that run in the browser or on
Node.js. A minified UMD bundle is provided along with the regular set of
CommonJS modules.

For example:

```html
<!DOCTYPE HTML>
<html>
  <head>
    <script src="dist/solid-client.min.js"></script>
  </head>
  <body>
    <script>
      var solid = SolidClient
    </script>
  </body>
</html>
```

Or, using a module loader:

```js
var solid = require('solid-client')
```

See the [installation docs](docs/installing.md) for more installation examples.

Take a look at the **[solid-client demo
page](https://solid.github.io/solid-client/demo/)** (source located in
`demo/index.html`) for usage examples.

## Tutorials

If you would like to learn how to build Solid apps using solid-client, please see:

* [solid introduction tutorial](https://github.com/solid/solid-tutorial-intro)
* [pastebin example tutorial](https://github.com/solid/solid-tutorial-pastebin)
* [using rdflib.js tutorial](https://github.com/solid/solid-tutorial-rdflib.js)

## Developing solid-client

**Node version:** 6.0+.

Install dev dependencies:

```
npm install
```

Building (uses Browserify, builds to `solid-client.js` and `dist/solid-client-no-rdflib.js`):

```
npm run build
```

## Testing

To run the unit tests:

```
npm test
```

This runs the [Tape](https://github.com/substack/tape) unit test suite.

## Releases

The following steps specify how to release solid-client:

Make sure you're at the HEAD of `master`.

```shell
$ git checkout master && git pull
```

Run `npm version` to bump the package version via git commit and git
tags.

```shell
# refer to http://semver.org/ for which of (major, minor, patch) to use
$ npm version [major|minor|patch]
```

Next, push the commit and tags:

```shell
$ git push --follow-tags
```

Finally release the package to `npmjs`.

```shell
$ npm publish
```

## Logging In and User Profiles

Before doing any sort of [reading or
writing](https://github.com/solid/solid-spec#reading-and-writing-resources) of
Solid resources, your app will likely need to authenticate a user and load their
profile, so let's start with those sections.

### Authentication

Solid currently uses [WebID-TLS](https://github.com/solid/solid-spec#webid-tls)
for authentication, which relies on a web browser's built-in key store to manage
certificates and prompt the user to select the correct certificate when
accessing a server.

Solid servers must always return a Solid-specific HTTP header called `User`,
which contains the [WebID](https://github.com/solid/solid-spec#identity) that
the user used to access this particular server. An empty header usually means
that the user is not authenticated.

#### Detecting the Current Logged-in User

Most of the WebID-TLS authentication process takes place before a web
page gets fully loaded and the javascript code has had a chance to run.
Since client-side Javascript code does *not* have access to most HTTP headers
(including the `User` header) of the page on which it runs, how does an app
discover if there is an already authenticated user that is accessing it?

The current best practice answer is -- the app should do an Ajax/XHR HEAD
request to the relevant resource:

1. either to the *current page* if it's a standalone app, or
2. to the requested resource (if it's an app that's acting as a viewer or
  editor, and requires a resource URI as a parameter)

For the first case (standalone apps), solid-client provides a convenience
`solid.currentUser()` method (which does a HEAD request to the current page in
the background). Usage:

```js
solid.currentUser()
  .then(function (currentWebId) {
    if (currentWebId) {
      console.log('Current WebID: %s', currentWebId)
    } else {
      console.log('You are not logged in')
    }
  })
```

For the second case (apps that are wrapping a resource as viewers or editors),
client apps can just use a `solid.login(targetUrl)` function to return the
current user's WebID. And if users are unable to log in, prompt the user
to create an account with `solid.signup()`.

#### Login example

Here is a typical example of authenticating a user and returning their WebID.
The following `login` function, specific to your application, wraps the
`solid.login()` function. If the promise is resolved, then an application
will do something with the `webId` value. Otherwise, if the promise is rejected,
the application may choose to display an error message.

HTML:

```html
<a href="#" onclick="login()">Login</a>
```

Javascript:

```javascript
var solid = require('solid')
var login = function() {
  // Get the current user
  solid.login().then(function (webId){
    // authentication succeeded; do something with the WebID string
    console.log(webId)
  }).catch(function (err) {
    // authentication failed; display some error message
    console.log(err)
  })
}
```

### Signup example

The `signup` function is very similar to the `login` function, wrapping the
`solid.signup()` function. It results in either a WebID or an error message
being returned.

HTML:

```html
<a href="#" onclick="signup()">Sign up</a>
```

Javascript:

```javascript
var solid = require('solid')
// Signup for a WebID
var signup = function() {
  solid.signup()
    .then(function (webId) {
      // authentication succeeded; do something with the WebID string
      console.log(webId)
    })
    .catch(function (err) {
      // authentication failed; display some error message
      console.log(err)
    })
}
```

### User Profiles

Once you have a user's WebID (say, from a `login()` call), it's often useful
to load the user profile:

```javascript
var profile = solid.login()
  .then(function (webId) {
    // have the webId, now load the profile
    return solid.getProfile(webId)
  })
```

The call to `getProfile(url)` loads the full [extended
profile](https://github.com/solid/solid-spec/blob/master/solid-webid-profiles.md#extended-profile):
the profile document itself, any `sameAs` and `seeAlso` links it finds there,
as well as the Preferences file.

Once a profile is loaded, you can access the values of the profile's pre-defined
fields, or look for predicates in the profile's parsed graph using
`profile.find()` and `profile.findAll()`:

```js
var ns = solid.vocab
solid.login()
  .then(function (webId) {
    return solid.getProfile(webId)
  })
  .then(function (profile) {
    profile.name  // -> 'Alice'
    profile.picture   // -> 'https://example.com/profile/icon.png'
    profile.find(ns.solid('inbox'))    // -> 'https://example.com/inbox/'
    profile.findAll(ns.owl('sameAs'))  // -> [ url1, url2 ]
  })
  .catch(function (err) {
    console.log('Error accessing profile: ' + err)
  })
```

#### Profile App Registry

The profile provides an interface to the user's App Registry.

```js
var ns = solid.vocab
solid.login()
  .then(function (webId) {
    return solid.getProfile(webId)
  })
  .then(function (profile) {
    return profile.loadAppRegistry()
  })
  .then(function (profile) {
    // The profile has been updated, app registry loaded. Now you can register
    // apps with is.
    var options = {
      name: 'Contact Manager',
      shortdesc: 'A reference contact manager',
      redirectTemplateUri: 'https://solid.github.io/contacts/?uri={uri}'
    }
    var typesForApp = [ ns.vcard('AddressBook') ]
    var isListed = true
    var app = new AppRegistration(options, typesForApp, isListed)
    return profile.registerApp(app)
  })
  .then(function (profile) {
    // The app entry was created. You can now query the registry for it
    return profile.appsForType(ns.vcard('AddressBook'))
  })
  .then(function (registrationResults) {
    var app = registrationResults[0]
    app.name  // -> 'Contact Manager'
    app.shortdesc  // -> ...
    app.redirectTemplateUri
  })
```

#### User Type Registry Index

If your application needs to do data discovery, it can also call
`loadTypeRegistry()` after loading the profile:

```javascript
var profile = solid.login()
  .then(function (webId) {
    return solid.getProfile(webId)
  })
  .then(function (profile) {
    return profile.loadTypeRegistry()
  })
```

Now, both listed and unlisted type indexes are loaded, and you can look up
where the user keeps various types.

```js
var ns = solid.vocab
// .. load profile and load type registry

var addressBookRegistrations = solid.getProfile(webId)
  .then(function (profile) {
    return profile.loadTypeRegistry()
  })
  .then(function (profile) {
    return profile.typeRegistryForClass(ns.vcard('AddressBook'))
  })
/*
-->
[
  an IndexRegistration(
    locationUri: 'https://localhost:8443/public-contacts/AddressBook.ttl',
    locationType: 'instance',
    isListed: true
  ),
  an IndexRegistration(
    locationUri: 'https://localhost:8443/personal-address-books/',
    locationType: 'container',
    isListed: false
  )
]
*/
```

You can then load the resources from the returned locations, as usual.

```js
addressBookRegistrations.forEach(function (registration) {
  if (registration.isInstance()) {
    // This is an instance (an individual resource)
  } else if (registration.isContainer()) {
    // This is a container with many address books
  }
})
```

#### Registering (and un-registering) Types in the Type Registry

To register an RDF Class with a user's Type Registry (listed or unlisted),
use `profile.registerType()`:

```js
var ns = solid.vocab
// .. load profile

var classToRegister = vocab.sioc('Post')
var locationToRegister = 'https://localhost:8443/new-posts-container/'
var isListed = true
profile.registerType(classToRegister, locationToRegister, 'container', isListed)
  .then(function (profile) {
    // Now the type is registered, and the profile's type registry is refreshed
    // querying the registry now will include the new container
    profile.typeRegistryForClass(ns.sioc('Post'))
  })

// To remove the same class from registry:
var classToRemove = ns.sioc('Post')
profile.unregisterType(classToRemove, isListed)
  .then(function (profile) {
    // Type is removed
    profile.typeRegistryForClass(ns.sioc('Post'))   // --> []
  })
```

## Web operations

solid-client uses a mix of [LDP](http://www.w3.org/TR/ldp/) and Solid-specific
functions to manipulate Web resources. Please see the
[Solid spec](https://github.com/solid/solid-spec) for more details.

### Getting information about a resource

Sometimes an application may need to get some useful meta data about a resource.
For instance, it may want to find out where the ACL resource is. Clients should
take notice to the fact that the `solid.web.head()` function will always
successfully complete, even for resources that don't exists, since that is
considered useful information. For instance, clients can use the
`solidResponse.xhr.status` value will indicate whether the resource exists or
not.

Here, for example, we can find out where the corresponding ACL resource is for
our new blog post `hello-world`.

```javascript
var solid = require('solid')
var url = 'https://example.org/blog/hello-world'
solid.web.head(url).then(
  function(solidResponse) {
    console.log(solidResponse.acl) // the ACL uri
    if (!solidResponse.exists()) {
      console.log("This resource doesn't exist")
    } else if (solidResponse.xhr.status === 403) {
      if (solidResponse.isLoggedIn()) {
        console.log("You don't have access to the resource")
      } else {
        console.log("Please authenticate")
      }
    }
  }
)
```

The `SolidResponse` object returned by most `solid.web` calls, including
`head()`, contains the following properties:

* `url` - the URL of the resource // `https://example.org/blog/hello-world`
* `acl` - the URL of the corresponding .acl resource  //
  `https://example.org/blog/hello-world.acl`
* `meta` - the URL of the corresponding .meta resource //
  `https://example.org/blog/hello-world.meta`
* `types` - An array of LDP types for the resource, if applicable. For example:
    `[ 'http://www.w3.org/ns/ldp#LDPResource',
       'http://www.w3.org/ns/ldp#Resource' ]`
* `user` - the WebID of the authenticated user (if authenticated) //
  `https://user.example.org/profile#me`
* `websocket` - the URI of the corresponding websocket instance //
  `wss://example.org/blog/hello-world`
* `method` - the HTTP verb (`get`, `put`, etc) of the original request that
  resulted in this response.
* `xhr` - the raw XMLHttpRequest object (e.g. xhr.status)

The response object also has some convenience methods:

* `contentType()` - returns the MIME type of the resource
* `isContainer()` - determines whether the resource is a Container or a regular
    resource

### Fetching a Resource

Assuming that a resource or a container exists (see
[creating resources](#creating-a-resource) and
[creating containers](#creating-a-solid-container) below), you can retrieve
it using `web.get()`:

```js
solid.web.get(url)
  .then(function (response) {
    if (response.isContainer()) {
      // This is an instance of SolidContainer, see Listing Containers below
      for (resourceUrl in response.resources) {
        // iterate over resources
      }
      for (subcontainerUrl in response.containers) {
        // iterate over sub-containers
      }
    } else {
      // Regular resource
      console.log('Raw resource: %s', response.raw())

      // You can access the parsed graph (parsed by RDFLib.js):
      var parsedGraph = response.parsedGraph()
    }
  })
  .catch(function (err) {
      console.log(err) // error object
    // ...
   })
```

#### Fetching a Parsed Graph

Once a resource is retrieved, we can access it as a parsed graph (here, parsed
by `rdflib.js`). This graph can then be queried.

```js
var solid = require('solid')
var vocab = solid.vocab

var url = 'https://example.org/blog/hello-world'

solid.web.get(url)
  .then(function(response) {
    var graph = response.parsedGraph()
    // Print all statements matching resources of type foaf:Post
    console.log(graph.statementsMatching(undefined, vocab.rdf('type'),
      vocab.sioc('Post')))
  })
  .catch(function(err) {
    console.log(err) // error object
  })
```

### Creating a Solid Container

The Solid client offers a function called `solid.web.createContainer()`,
which is used to create containers. The
function accepts the following parameters:

* `parentDir` (string) - the URL of the parent container in which the new
  resource/container will be created.
* `containerName` (string) (optional) - the value for the `Slug` header -- i.e. the name
  of the new resource to be created; this value is optional.
* `options` (object) - Optional hashmap of request options
* `data` (string) - Optional RDF data serialized as `text/turtle`; can also be an empty
  string if no data will be sent.

In the example below we are also sending some meta data (semantics) about the
container, setting its type to `sioc:Blog`.

```javascript
// Assumes you've loaded rdflib.js and solid-client, see Dependences above
var solid = require('solid')
var parentUrl = 'https://example.org/'
var containerName = 'blog'
var options = {}
var data = '<#this> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://rdfs.org/sioc/ns#Blog> .'

solid.web.createContainer(parentUrl, containerName, options, data).then(
  function(solidResponse) {
    console.log(solidResponse)
    // The resulting object has several useful properties.
    // See lib/solid/response.js for details
    // solidResponse.url - value of the Location header
    // solidResponse.acl - url of acl resource
    // solidResponse.meta - url of meta resource
  }
).catch(function(err){
  console.log(err) // error object
})
```

Note that the `options` and `data` parameters are optional, and you can simply
do `solid.web.createContainer(url, name)`.

### Listing a Solid Container

To list the contents of a Solid container, just use `solid.web.get()`.
This returns a promise that resolves to a `SolidContainer` instance,
which will contain various useful properties:

- A short name (`.name`) and absolute URI (`.uri`)
- A `.parsedGraph` property for further RDF queries
- A parsed list of links to all the contents (both containers and resources)
  (`.contentsUris`)
- A list of RDF types to which the container belongs (`.types`)
- A hashmap of all sub-Containers within this container, keyed by absolute uri
  (`.containers`)
- A hashmap of all non-container Resources within this container, also keyed by
  absolute uri. (`.resources`)

Containers also have several convenience methods:

- `container.isEmpty()` will return `true` when there are no sub-containers or
  resources inside it
- `container.findByType(rdfClass)` will return an array of resources or
  containers that have the given `rdfClass` in their `.types` array

For example:

```js
var container = solid.web.get('/settings/')
                  .then(function (container) {
                    console.log(container)
                    // See below
                  })

// container is an instance of SolidContainer (see lib/solid/container.js)
container.uri   // -> 'https://localhost:8443/settings/'
container.name  // -> 'settings'
container.isEmpty()  // -> false
container.types // ->
[
  'http://www.w3.org/ns/ldp#BasicContainer',
  'http://www.w3.org/ns/ldp#Container'
]
container.contentsUris // ->
[
  'https://localhost:8443/settings/prefs.ttl',
  'https://localhost:8443/settings/privateTypeIndex.ttl',
  'https://localhost:8443/settings/testcontainer/'
]

var subContainer =
    container.containers['https://localhost:8443/settings/testcontainer/']
subContainer.name // -> 'testcontainer'
subContainer.types // ->
[
  'http://www.w3.org/ns/ldp#BasicContainer',
  'http://www.w3.org/ns/ldp#Container',
  'http://www.w3.org/ns/ldp#Resource'
]

var resource =
  container.resources['https://localhost:8443/settings/privateTypeIndex.ttl']
// resource - SolidResource instance
resource.name // -> 'privateTypeIndex.ttl'
resource.types // ->
[
  'http://www.w3.org/ns/ldp#Resource',
  'http://www.w3.org/ns/solid/terms#TypeIndex',
  'http://www.w3.org/ns/solid/terms#UnlistedDocument'
]
resource.isType('http://www.w3.org/ns/solid/terms#TypeIndex')  // -> true

container.findByType('http://www.w3.org/ns/ldp#Resource')  // ->
[
  // a SolidContainer('testcontainer'),
  // a SolidResource('privateTypeIndex.ttl'),
  // a SolidResource('prefs.ttl')
]
```

### Creating a resource

Creating a regular LDP resource is done using the `web.post()` method.

In this example we will create the resource `hello-world` under the newly
created `blog/` container.

```javascript
var solid = require('solid')
var parentDir = 'https://example.org/blog/'
var slug = 'hello-world'
var data = `
<> a <http://rdfs.org/sioc/ns#Post> ;
    <http://purl.org/dc/terms/title> "First post" ;
    <http://rdfs.org/sioc/ns#content> "Hello world! This is my first post" .
`

solid.web.post(parentDir, data, slug)
  .then(function (response) {
    console.log(response.url) // URL of the newly created resource
  })
  .catch(function (err){
    console.log(err) // error object
  })
```

### Updating a resource

Sometimes we need to update a resource after making a small change. For
instance, we sometimes need to delete a triple, or update the value of an object
(technically by replacing the triple with a new one). Luckily, Solid allows us
to use the `HTTP PATCH` operation to do very small changes.

Let's try to change the value of the title in our first post. To do so, we need
to indicate which triple we want to replace, and then the triple that will
replace it.

Let's create the statements and serialize them to Turtle before patching the
blog post resource:

```js
var rdf = require('rdflib')
var url = 'https://example.org/blog/hello-world'
var vocab = ns.vocab

var oldTitleTriple = rdf.triple(rdf.namedNode(url), ns.dct('title'),
  rdf.literal("First post")).toCanonical()

var newTitleTriple = rdf.triple(rdf.namedNode(url), ns.dct('title'),
  rdf.literal("Hello")).toCanonical()
```

Now we can actually patch the resource. The `solid.web.patch()` function (also
aliased to `solid.web.update()`) takes three arguments:

* `url` (string) - the URL of the resource to be overwritten.
* `toDel` (array) - an array of statements to be deleted, serialized as Turtle.
* `toIns` (array) - an array of statements to be inserted, serialized as Turtle.

```javascript
var solid = require('solid')
var toDel = [ oldTitleTriple ]
var toIns = [ newTitleTriple ]
solid.web.patch(url, toDel, toIns)
  .then(function (response){
    console.log(response.xhr.status) // HTTP 200 (OK)
  })
  .catch(function(err) {
    console.log(err) // error object
  })
```

### Replacing a resource

We can also completely replace (overwrite) existing resources with new content,
using the client's `solid.web.put()` function (also aliased to `replace()`). The
function accepts the following parameters:

* `url` (string) - the URL of the resource to be overwritten.
* `data` (string) - RDF data serialized as `text/turtle`; can also be an empty
  string if no data will be sent.
* `mime` (string) (optional) - the mime type for this resource; this value is
  optional and defaults to `text/turtle`.

Here is an example where we try to overwrite the existing resource
`hello-world`, giving it a bogus type - `http://example.org/#Post`.

```javascript
var solid = require('solid')
var url = 'https://example.org/blog/hello-world'
var data = '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/#Post> .'

solid.web.put(url, data)
  .then(function (response) {
    console.log(response.xhr.status) // HTTP 200 (OK)
  })
  .catch(function(err) {
    console.log(err) // error object
  })
```

### Deleting a resource

Delete an RDF resource from the Web. For example, we can delete the blog post
`hello-world` we created earlier, using the `solid.web.del()` function.

**NOTE:** while this function can also be used to delete containers, it will
only work for empty containers. For now, app developers should make sure to
empty a container by recursively calling calling this function on its contents.

```javascript
var solid = require('solid')
var url = 'https://example.org/blog/hello-world'

solid.web.del(url)
  .then(function (response) {
    console.log(response)
  }).catch(function (err) {
    console.log(err) // error object
  })
```

### Managing Resource Permissions

Each Solid resource has a set of permissions that determine which user
(identified by their WebID) has read and write access to it, called an
*ACL resource*.
(See the [`web-access-control-spec` repo](https://github.com/solid/web-access-control-spec)
for the exact details.)

solid-client has a set of convenience methods to help developers manage those
permissions.

#### Reading Permissions

To load the corresponding ACL resource, for a given file:

```js
var solid = require('solid')
var resourceUrl = 'https://example.org/blog/hello-world'

solid.getPermissions(resourceUrl)
  .then(function (permissionSet) {
    // Now the permission set, parsed from `hello-world.acl` is loaded,
    // and you can iterate over the individual authorizations
    permissionSet.forEach(function (auth) {
      if (auth.isAgent()) {
        console.log('agent webId: ' + auth.agent)
      } else if (auth.isPublic()) {
        // this permission is for everyone (acl:agentClass foaf:Agent)
      } else if (auth.isGroup()) {
        console.log('agentClass webId: ' + auth.group)
      }
      // You can also use auth.webId() for all cases:
      console.log('agent/group webId: ' + auth.webId())
      // You can check what sort of access modes are granted:
      auth.allowsRead()  // -> true if the authorization contains acl:Read mode
      auth.allowsWrite()
      auth.allowsAppend()
      auth.allowsControl()
      // Check to see if this Authorization is inherited (`acl:default`)
      auth.isInherited()  // -> false for a resource, usually true for container
      // Check to see if access is allowed from a given Origin
      auth.allowsOrigin('https://example.com')
    })
  })
```

**Note:** You can read the permissions for a given resource *only* if you have
`acl:Control` access mode for that resource. (You also need that access mode to
edit those permissions, as well.)

You can also access individual authorizations from a resource set:

```js
solid.getPermissions(resourceUrl)
  .then(function (permissionSet) {
    var auth = permissionSet.permissionFor(bobWebId)
    auth.webId()  // -> bob's web id
    auth.allowsRead()  // -> true if bob has acl:Read permission
    auth.allModes()    // -> array of access modes granted
    auth.allOrigins()  // -> array of allowed origin URLs
    // If this is for the root container's ACL, you can also load a user's
    // emails using the `mailTo` property. (Unofficial functionality)
    auth.mailTo  // -> ['bob@example.com', 'bob@gmail.com']
  })
```

#### Editing Permissions

To manage the set of permissions for a given resource (provided the current
user has `acl:Control` access mode granted to them for that resource), use
the convenience methods provided by `PermissionSet`.

The example below adds 3 different permissions:

1. Allows Alice to Read, Write and Control the resource
2. Allows Public Read access (that's the `solid.acl.EVERYONE`)
3. Grants Bob Write access (in addition to the Read access he inherits from
   the above permission, since he's a member of the Public).
   Also, this Write access is only allowed from a particular *origin*.

```js
var solid = require('solid')
var resourceUrl = 'https://example.org/blog/hello-world'
var aliceWebId = 'https://alice.example.org/profile/card#me'
var bobWebId = 'https://bob.example.org/profile/card#me'
var allowedOrigin = 'https://example.org'

solid.getPermissions(resourceUrl)
  .then(function (permissionSet) {
    return permissionSet
      .addPermission(aliceWebId, [solid.acl.READ, solid.acl.WRITE,
        solid.acl.CONTROL])
      .addPermission(solid.acl.EVERYONE, solid.acl.READ)
      // see also .addGroupPermission()
      .addPermission(bobWebId, solid.acl.WRITE, allowedOrigin)
      .save()
  })
  .then(function (response) {
    console.log('Permissions saved successfully')
  })
  .catch(function (err) {
    console.log('Error saving permissions')
  })
```

To *delete* all permissions associated with a resource, use
`clearPermissions()`. Keep in mind that permissions are inherited from a
resource's parent container, and if you delete an individual ACL resource,
this simply means that the permissions reset to that of the upstream container.
You can also clear the ACLs of the container, all the way up to the root storage
container's ACL, which cannot be deleted. Refer to the
[ACL Inheritance Algorithm](https://github.com/solid/web-access-control-spec#acl-inheritance-algorithm)
section of the spec.

```js
// If you have an existing PermissionSet as a result of `getPermissions()`:
solid.getPermissions('https://www.example.com/file1')
  .then(function (permissionSet) {
    return permissionSet.clear()  // deletes the file1.acl resource
  })
// Otherwise, use the helper function
//   solid.clearPermissions(resourceUrl) instead
solid.clearPermissions('https://www.example.com/file1')
  .then(function (response) {
    // file1.acl is now deleted
  })
```
