# solid.js
[![](https://img.shields.io/badge/project-Solid-7C4DFF.svg?style=flat-square)](https://github.com/solid/solid)

Javascript library for writing [Solid](https://github.com/solid/solid-spec)
applications.

Solid.js is currently for client-side use only (inside a web browser).

**PLEASE NOTE** This document describes what functionality is offered by
the Solid.js library and should not be mistaken for a tutorial on how to write
Solid apps. If you would like to learn how to build Solid apps using Solid.js,
please see the
[pastebin example tutorial](https://github.com/solid/solid-tutorial-pastebin),
as well as the
[tutorial for using rdflib.js](https://github.com/solid/solid-tutorial-rdflib.js).

See also:

* [solid.js Changelog](CHANGELOG.md)

## Dependencies

This library currently depends on
[rdflib.js](https://github.com/linkeddata/rdflib.js/). Since `rdflib.js`
currently does not work with [Browserify](http://browserify.org/), please make
sure to load the `rdflib.js` script **before** loading `solid.js`:

In your `index.html`:

```html
<script src="rdflib.js"></script>
<script src="solid.js"></script>
<script>
  var Solid = require('solid.js');

  // Use Solid client here ...
  console.log('solid.js version: ' + Solid.meta.version());
</script>
```

Note: A copy of `rdflib.js` is provided in this repo's `vendor/` directory
(this is the version used by QUnit tests).

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

To run the QUnit tests:

```
npm test
```

This opens a web browser on `test/index.html` and runs the QUnit test suite.

## Web operations

Solid.js uses a mix of [LDP](http://www.w3.org/TR/ldp/) and Solid-specific
functions to manipulate Web resources. Please see the
[Solid spec](https://github.com/solid/solid-spec) for more details.

### Creating a Solid Container

The Solid client offers a function called `Solid.web.post()` (also
aliased to `Solid.web.create()`), which is used to create containers. The
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
`hello-world` is a regular resource (file). In the example below  we are also
sending some meta data (semantics) about the container, setting its type to
`sioc:Blog`.

```javascript
// Assumes you've loaded rdflib.js and solid.js, see Dependences above
var Solid = require('solid.js');
var parentDir = 'https://example.org/';
var slug = 'blog';
var data = '<#this> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://rdfs.org/sioc/ns#Blog> .';
var isContainer = true;

Solid.web.post(parentDir, data, slug, isContainer).then(
  function(meta) {
    console.log(meta);
    // The resulting object has several useful properties. Refer to the solid.js docs for more information/examples
    // meta.url - value of the Location header
    // meta.acl - url of acl resource
    // meta.meta - url of meta resource
  }
).catch(function(err){
  console.log(err); // error object
  console.log(err.status); // contains the error status
  console.log(err.xhr); // contains the xhr object
});
```

### Creating a resource

Creating a regular LDP resource is very similar to creating containers, except
for the `isContainer` value, which is no longer set.

In this example we will create the resource `hello-world` under the newly
created `blog/` container.

```javascript
var Solid = require('solid.js');
var parentDir = 'https://example.org/blog/';
var slug = 'hello-world';
var data = `
<> a <http://rdfs.org/sioc/ns#Post> ;
    <http://purl.org/dc/terms/title> "First post" ;
    <http://rdfs.org/sioc/ns#content> "Hello world! This is my first post" .
`;

Solid.web.post(parentDir, data, slug).then(
  function(meta) {
    console.log(meta.url); // URL of the newly created resource
  }
).catch(function(err){
  console.log(err); // error object
  // ...
});
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
var url = 'https://example.org/blog/hello-world';

var oldTitle = $rdf.st($rdf.sym(url), $rdf.sym('http://purl.org/dc/terms/title'), "First post").toNT();

var newTitle = $rdf.st($rdf.sym(url), $rdf.sym('http://purl.org/dc/terms/title'), "Hello").toNT();
```

Now we can actually patch the resource. The `Solid.web.patch()` function (also
aliased to `Solid.web.update()`) takes three arguments:

* `url` (string) - the URL of the resource to be overwritten.
* `toDel` (array) - an array of statements to be deleted, serialized as Turtle.
* `toIns` (array) - an array of statements to be inserted, serialized as Turtle.

```javascript
var Solid = require('solid.js');
var toDel = [ oldTtitle ];
var toIns = [ newTitle ];
Solid.web.patch(url, toDel, toIns).then(function (meta){
  console.log(meta.xhr.status); // HTTP 200 (OK)
}).catch(function(err) {
  console.log(err); // error object
  // ...
});
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
var Solid = require('solid.js');
var url = 'https://example.org/blog/hello-world';
var data = '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/#Post> .';

Solid.web.put(url, data).then(
  function (meta) {
    console.log(meta.xhr.status); // HTTP 200 (OK)
  }
).catch(function(err){
  console.log(err); // error object
  // ...
});
```

### Reading a resource
We can now read the updated RDF resource, using the function `Solid.web.get()`.
This function returns a graph object, which can then be queried. The graph
object is created by `rdflib.js` and it inherits all its methods.

```javascript
var Solid = require('solid.js');
var url = 'https://example.org/blog/hello-world';

Solid.web.get(url).then(
  function(g) {
    // Print all statements matching resources of type foaf:Post
    console.log(g.statementsMatching(undefined, RDF('type'), SIOC('Post')));
  }
).catch(
  function(err) {
    console.log(err); // error object
    // ...
  }
);
```

### Getting information about a resource

Sometimes an application may need to get some useful meta data about a resource.
For instance, it may want to find out where the ACL resource is. Clients should
take notice to the fact that the `Solid.web.head()` function will always
successfully complete, even for resources that don't exists, since that is
considered useful information. For instance, clients can use the
`meta.xhr.status` value will indicate whether the resource exists or not.

Here, for example, we can find out where the corresponding ACL resource is for
our new blog post `hellow-world`.

```javascript
var Solid = require('solid.js');
var url = 'https://example.org/blog/hellow-world';
Solid.web.head(url).then(
  function(meta) {
    console.log(meta.acl); // the ACL uri
    if (meta.xhr.status === 403) {
      console.log("You don't have access to the resource");
    } else if (meta.xhr.status === 404) {
      console.log("This resource doesn't exist");
    }
  }
);
```

The `meta` object returned by `head()` contains the following properties:

* `meta.url` - the URL of the resource // https://example.org/blog/hellow-world
* `meta.acl` - the URL of the corresponding acl resource  //
  `https://example.org/blog/hellow-world.acl`
* `meta.meta` - the URL of the corresponding meta resource //
  `https://example.org/blog/hellow-world.meta`
* `meta.user` - the WebID of the authenticated user (if authenticated) //
  `https://user.example.org/profile#me`
* `meta.websocket` - the URI of the corresponding websocket instance //
  `wss://example.org/blog/hellow-world`
* `meta.xhr` - the xhr object (e.g. xhr.status)

### Deleting a resource

Delete an RDF resource from the Web. For example, we can delete the blog post
`hello-world` we created earlier, using the `Solid.web.del()` function.

**NOTE:** while this function can also be used to delete containers, it will
only work for empty containers. For now, app developers should make sure to
empty a container by recursively calling calling this function on its contents.

```javascript
var Solid = require('solid.js');
var url = 'https://example.org/blog/hello-world';

Solid.web.del(url).then(
  function(success) {
    console.log(success); // true/false
  }
).catch(
  function(err) {
    console.log(err); // error object
    // ...
  }
);
```

### See also

[Linked Data Platform](http://www.w3.org/TR/ldp/) specification.

[Solid](https://github.com/solid/solid-spec) specification.

### Authentication

In the context of Solid, authentication is often conflated with identity
discovery. Because applications run in the browser, users don't have to
authenticate themselves to applications, but instead to the servers where the
data resides.

However, identity discovery still involves an authentication step, through which
the application will have access to the a Solid-specific HTTP header called
`User`. Solid servers commonly include this header in HTTP responses, where it
contains the `WebID` of the authenticated user. An empty header usually means
that the user is not authenticated.

Both Login and Signup functions return the user's WebID. Sometimes users don't
have a WebID account, and in that case they need to sign up for one. The signup
process also results in getting the user's WebID. If the operation is successful
and a WebID is returned, then the user is considered to be authenticated.

### Login example

Here is a typical example of authenticating a user and returning their WebID.
The following `login` function, specific to your application, wraps the
`Solid.auth.login` function. If the promise is resolved, then an application
will do something with the `webid` value. Otherwise, if the promise is rejected,
the application may choose to display an error message.

HTML:

```html
<a href="#" onclick="login()">Login</a>
```

Javascript:

```javascript
var Solid = require('solid.js');
var login = function() {
  // Get the current user
  Solid.auth.login().then(function(webid){
    // authentication succeeded; do something with the WebID string
    console.log(webid);
  }).catch(function(err) {
    // authentication failed; display some error message
    console.log(err);
  });
};
```

### Signup example

The `signup` function is very similar to the `login` function, wrapping the
`Solid.auth.signup` function. It results in either a WebID or an error message
being returned.

HTML:

```html
<a href="#" onclick="signup()">Sign up</a>
```

Javascript:

```javascript
var Solid = require('solid.js');
// Signup for a WebID
var signup = function() {
  Solid.auth.signup().then(function(webid) {
    // authentication succeeded; do something with the WebID string
    console.log(webid);
  }).catch(function(err) {
    // authentication failed; display some error message
    console.log(err);
  });
};
```

### See also

* [Solid Spec](https://github.com/solid/solid-spec)
* [WebID](http://www.w3.org/2005/Incubator/webid/spec/identity)
* [User header](https://github.com/solid/solid-spec#finding-out-the-identity-currently-used)
