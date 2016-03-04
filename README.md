# solid.js
[![](https://img.shields.io/badge/project-Solid-7C4DFF.svg?style=flat-square)](https://github.com/solid/solid)
[![Build Status](https://travis-ci.org/solid/solid.js.svg?branch=master)](https://travis-ci.org/solid/solid.js)

Javascript library for writing [Solid](https://github.com/solid/solid)
applications. (See **[Changelog](CHANGELOG.md)** for version history.)

## Usage

Solid.js is currently intended for client-side use only (inside a web browser):

1. Load dependencies (currently,
  [rdflib.js](https://github.com/linkeddata/rdflib.js/)).
2. Load `solid.js` from a local copy (or directly from Github Pages).
3. Use the `require('solid')` function provided by Browserify to import.

Example `index.html`:

```html
<script src="https://linkeddata.github.io/rdflib.js/archive/rdflib-0.5.0.min.js"></script>
<script src="https://solid.github.io/solid.js/dist/solid-0.11.1.js"></script>
<script>
  // $rdf is exported as a global when you load RDFLib, above
  var solid = require('solid')
  // Use Solid client here ...
  console.log('solid.js version: ' + solid.meta.version())
</script>
```

Take a look at the **[Solid.js Demo
Page](https://solid.github.io/solid.js/demo/)** (source located in
`demo/index.html`) for more usage examples.

## Tutorials

If you would like to learn how to build Solid apps using Solid.js, please see:

* [solid introduction tutorial](https://github.com/solid/solid-tutorial-intro)
* [pastebin example tutorial](https://github.com/solid/solid-tutorial-pastebin)
* [using rdflib.js tutorial](https://github.com/solid/solid-tutorial-rdflib.js)

## Developing Solid.js

Install dev dependencies:

```
npm install
```

Building (uses Browserify, builds to `dist/solid.js` and `dist/solid.min.js`):

```
npm run build
```

## Testing

To run the unit tests:

```
npm test
```

This runs the [Tape](https://github.com/substack/tape) unit test suite.

## Logging In and User Profiles

Before doing any sort of [Web operations](#web-operations) on Solid resources,
your app will likely need to authenticate a user and load their profile,
so let's start with those sections.

See also:

* [Solid Spec](https://github.com/solid/solid-spec)
* [WebID](http://www.w3.org/2005/Incubator/webid/spec/identity)
* [User header](https://github.com/solid/solid-spec#finding-out-the-identity-currently-used)

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

For the first case (standalone apps), Solid.js provides a convenience
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
  solid.login().then(function(webId){
    // authentication succeeded; do something with the WebID string
    console.log(webId)
  }).catch(function(err) {
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
  solid.signup().then(function(webId) {
    // authentication succeeded; do something with the WebID string
    console.log(webId)
  }).catch(function(err) {
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
  .then(function(webId){
    // have the webId, now load the profile
    return solid.getProfile(webId)
  })
```

The call to `getProfile(url)` loads the full extended profile -- the profile
document itself, any `sameAs` and `seeAlso` links it finds there, as well
as the Preferences file.

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

Now, both private and public type indexes are loaded, and you can look up
where the user keeps various types.

```javascript
var vocab = solid.vocab
var bookLocations =
  profile.typeRegistryForClass(vocab.vcard('AddressBook'))
console.log(bookLocations)
/*
{
  public: [ array of triples (solid:instance or solid:instanceContainer) ],
  private: [ array of triples (same) ]
}
*/
```

## Web operations

Solid.js uses a mix of [LDP](http://www.w3.org/TR/ldp/) and Solid-specific
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
our new blog post `hellow-world`.

```javascript
var solid = require('solid')
var url = 'https://example.org/blog/hellow-world'
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

* `url` - the URL of the resource // https://example.org/blog/hellow-world
* `acl` - the URL of the corresponding acl resource  //
  `https://example.org/blog/hellow-world.acl`
* `meta` - the URL of the corresponding meta resource //
  `https://example.org/blog/hellow-world.meta`
* `type` - LDP type for the resource, if applicable. For example:
  `http://www.w3.org/ns/ldp#Resource`
* `user` - the WebID of the authenticated user (if authenticated) //
  `https://user.example.org/profile#me`
* `websocket` - the URI of the corresponding websocket instance //
  `wss://example.org/blog/hellow-world`
* `method` - the HTTP verb (`get`, `put`, etc) of the original request that
  resulted in this response.
* `xhr` - the raw XMLHttpRequest object (e.g. xhr.status)


### Creating a Solid Container

The Solid client offers a function called `solid.web.post()` (also
aliased to `solid.web.create()`), which is used to create containers. The
function accepts the following parameters:

* `parentDir` (string) - the URL of the parent container in which the new
  resource/container will be created.
* `data` (string) - RDF data serialized as `text/turtle`; can also be an empty
  string if no data will be sent.
* `slug` (string) (optional) - the value for the `Slug` header -- i.e. the name
  of the new resource to be created; this value is optional.
* `isContainer` (boolean) (optional) - whether the new resource should be an
  LDP container or a regular LDP resource; defaults to LDP resource if the
  value is not set; this value is optional.
* `mime` (string) (optional) - the mime type for this resource; this value is
  optional and defaults to `text/turtle`. This value is ignored when creating
  containers.

For example, a blog application may decide to store posts in a hierarchical
manner -- i.e. `/blog/hello-world`. Here, `blog` is a container, while
`hello-world` is a regular resource (file). In the example below we are also
sending some meta data (semantics) about the container, setting its type to
`sioc:Blog`.

```javascript
// Assumes you've loaded rdflib.js and solid.js, see Dependences above
var solid = require('solid')
var parentDir = 'https://example.org/'
var slug = 'blog'
var data = '<#this> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://rdfs.org/sioc/ns#Blog> .'
var isContainer = true

solid.web.post(parentDir, data, slug, isContainer).then(
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
  console.log(err.status) // contains the error status
  console.log(err.xhr) // contains the xhr object
})
```

### Listing a Solid Container

To list the contents of a Solid container, use `solid.web.list()`.
This returns a `SolidContainer` instance, which will contained various
useful properties:

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

```javascript
var container = solid.web.list('/settings/')
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
  'http://www.w3.org/ns/ldp#Resource', 'http://www.w3.org/ns/solid/terms#PrivateTypeIndex'
]
resource.isType('http://www.w3.org/ns/solid/terms#PrivateTypeIndex')  // -> true

container.findByType('http://www.w3.org/ns/ldp#Resource')  // ->
[
  // a SolidContainer('testcontainer'),
  // a SolidResource('privateTypeIndex.ttl'),
  // a SolidResource('prefs.ttl')
]
```

### Creating a resource

Creating a regular LDP resource is very similar to creating containers, except
for the `isContainer` value, which is no longer set.

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

solid.web.post(parentDir, data, slug).then(
  function(meta) {
    console.log(meta.url) // URL of the newly created resource
  }
).catch(function(err){
  console.log(err) // error object
  // ...
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

```javascript
// $rdf is a global exposed by loading 'rdflib.js'
var url = 'https://example.org/blog/hello-world'

var oldTitle = $rdf.st($rdf.sym(url), $rdf.sym('http://purl.org/dc/terms/title'), "First post").toNT()

var newTitle = $rdf.st($rdf.sym(url), $rdf.sym('http://purl.org/dc/terms/title'), "Hello").toNT()
```

Now we can actually patch the resource. The `Solid.web.patch()` function (also
aliased to `Solid.web.update()`) takes three arguments:

* `url` (string) - the URL of the resource to be overwritten.
* `toDel` (array) - an array of statements to be deleted, serialized as Turtle.
* `toIns` (array) - an array of statements to be inserted, serialized as Turtle.

```javascript
var solid = require('solid')
var toDel = [ oldTtitle ]
var toIns = [ newTitle ]
solid.web.patch(url, toDel, toIns).then(function (meta){
  console.log(meta.xhr.status) // HTTP 200 (OK)
}).catch(function(err) {
  console.log(err) // error object
  // ...
})
```

### Replacing a resource

We can also completely replace (overwrite) existing resources with new content,
using the client's `Solid.web.put()` function (also aliased to `replace()`). The
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

solid.web.put(url, data).then(
  function (meta) {
    console.log(meta.xhr.status) // HTTP 200 (OK)
  }
).catch(function(err){
  console.log(err) // error object
  // ...
})
```

### Reading a resource

We can now retrieve the created resource in its raw (unparsed form).

```javascript
var url = 'https://example.org/blog/hello-world'
solid.web.get(url).then(
  function(response) {
    console.log('Raw resource: %s', response.raw())
  }
).catch(
  function(err) {
    console.log(err) // error object
    // ...
  }
)
```

Alternatively, we can retrieve it already parsed (here, by `rdflib.js`), using
the function  `Solid.web.getParsedGraph()`.
This function returns a graph object, which can then be queried.

```javascript
var solid = require('solid')
// $rdf is a global exposed by loading 'rdflib.js'
solid.config.parser = 'rdflib'  // 'rdflib' is the default parser
var RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
var SIOC = $rdf.Namespace('http://rdfs.org/sioc/ns#')

var url = 'https://example.org/blog/hello-world'

solid.web.getParsedGraph(url).then(
  function(graphed) {
    // Print all statements matching resources of type foaf:Post
    console.log(graphed.statementsMatching(undefined, RDF('type'),
      SIOC('Post')))
  }
).catch(
  function(err) {
    console.log(err) // error object
    // ...
  }
)
```

### Deleting a resource

Delete an RDF resource from the Web. For example, we can delete the blog post
`hello-world` we created earlier, using the `Solid.web.del()` function.

**NOTE:** while this function can also be used to delete containers, it will
only work for empty containers. For now, app developers should make sure to
empty a container by recursively calling calling this function on its contents.

```javascript
var solid = require('solid')
var url = 'https://example.org/blog/hello-world'

solid.web.del(url).then(
  function(success) {
    console.log(success) // true/false
  }
).catch(
  function(err) {
    console.log(err) // error object
    // ...
  }
)
```

### See also

[Linked Data Platform](http://www.w3.org/TR/ldp/) specification.

[Solid](https://github.com/solid/solid-spec) specification.
