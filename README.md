# solid.js
[![](https://img.shields.io/badge/project-Solid-7C4DFF.svg?style=flat-square)](https://github.com/solid/solid)

Javascript library for Solid applications

# Dependencies
This library currently depends on [rdflib.js](https://github.com/linkeddata/rdflib.js/). Please make sure to load the `rdflib.js` script **before** loading `solid.js`.

# Web operations

This chapter provides an introduction to the functions you can implement in your own app, in order to manipulate resources using LDP-friendly calls.

[LDP](http://www.w3.org/TR/ldp/) is a W3C standard that defines a set of rules for HTTP operations on web resources, some based on RDF, to provide an architecture for read-write Linked Data on the web.

LDP structures web resources into two main categories, in a very similar way to how a file system structures data into files and folders:
* containers (i.e. folders)
* resources (i.e. files or other containers)

For example, a blog application may decide to store posts in a hierarchical manner -- i.e. `/blog/hello-world`. Here, `blog` is a container, while `hello-world` is a regular resource (file).

## Creating a container (folder)
Creating a container is quite trivial. The `solid.js` library offers a function called `Solid.web.post()`, which does most of the work for us. The function accepts the following parameters:

* `parentDir` (string) - the URL of the parent container in which the new resource/container will be created.
* `data` (string) - RDF data serialized as `text/turtle`; can also be an empty string if no data will be sent.
* `slug` (string) (optional) - the value for the `Slug` header -- i.e. the name of the new resource to be created; this value is optional.
* `isContainer` (boolean) (optional) - whether the new resource should be an LDP container or a regular LDP resource; defaults to LDP resource if the value is not set; this value is optional.

Picking up from the blog example above, we will now create a container called `blog` under `https://example.org/`. In this process we are also sending some meta data (semantics) about the container, setting its type to `sioc:Blog`.

```javascript
var parentDir = 'https://example.org/';
var slug = 'blog';
var data = '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://rdfs.org/sioc/ns#Blog> .';
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

## Creating a resource
Creating a regular LDP resource is very similar to creating containers, except for the `isContainer` value, which is no longer set.

In this example we will create the resource `hello-world` under the newly created `blog/` container. It will be an empty resource for now. 

```javascript
var parentDir = 'https://example.org/blog/';
var slug = 'hello-world';
var data = '';

Solid.web.post(parentDir, data, slug).then(
    function(meta) {
        console.log(meta.url); // URL of the newly created resource
    }
).catch(function(err){
    console.log(err); // error object
    ...
});
```

## Overwriting a resource
You can also overwrite existing resources with new content, using the `Solid.web.put` function. The function accepts the following parameters:

* `url` (string) - the URL of the resource to be overwritten.
* `data` (string) - RDF data serialized as `text/turtle`; can also be an empty string if no data will be sent.

Here is an example where we try to overwrite the existing resource `hello-world` by sending some data about the resource, setting its type to `sioc:Post`. 


```javascript
var url = 'https://example.org/blog/hello-world';
var data = '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://rdfs.org/sioc/ns#Post> .';

Solid.web.put(url, data).then(
    function(meta) {
        console.log(meta);
        console.log(meta.xhr.status); // HTTP 200 (OK)
    }
).catch(function(err){
    console.log(err); // error object
    ...
});
```

## Reading a resource
We can now read the updated RDF resource, using the function `Solid.web.get`. This function returns a graph object, which can then be queried. The graph object is created by `rdflib.js` and it inherits all its methods.

```javascript
var url = 'https://example.org/blog/hello-world';

Solid.web.get(url).then(
    function(g) {
        // Print all statements matching resources of type foaf:Post
        console.log(g.statementsMatching(undefined, RDF('type'), SIOC('Post')));
    }
).catch(
    function(err) {
        console.log(err); // error object
        ...
    }
);
```

## Getting some information on a resource
Sometimes an application may need to get some useful meta data about a resource. For instance, it may want to find out where the ACL resource is. Clients should take notice to the fact that the `Solid.web.head` function will always successfully complete, even for resources that don't exists, since that is considered useful information. For instance, clients can use the `meta.xhr.status` value will indicate whether the resource exists or not.

Here, for example, we can find out where the corresponding ACL resource is for our new blog post `hellow-world`.

```javascript
var url = 'https://example.org/blog/hellow-world';
Solid.web.head(url).then(
    function(meta) {
        console.log(meta.acl); // the ACL uri
        if (meta.xhr.status === 403) {
            console.log("You don't have access to the resource");
        }
    }
);
```

## Deleting a resource
Delete an RDF resource from the Web. For example, we can delete the blog post `hello-world` we created earlier, using the `Solid.web.del` function.

**NOTE:** while this function can also be used to delete containers, it will only work for empty containers. For now, app developers should make sure to empty a container by recursively calling calling this function on its contents.

```javascript
var url = 'https://example.org/blog/hello-world';

Solid.web.del(url).then(
    function(success) {
        console.log(success); // true/false
    }
).catch(
    function(err) {
        console.log(err); // error object
        ...
    }
);
```

## See also

[Linked Data Platform](http://www.w3.org/TR/ldp/) specification.

[Solid](https://github.com/solid/solid-spec) specification.


# Authentication

In the context of Solid, authentication is often conflated with identity discovery. Because applications run in the browser, users don't have to authenticate themselves to applications, but instead to the servers where the data resides.

However, identity discovery still involves an authentication step, through which the application will have access to the a Solid-specific HTTP header called `User`. Solid servers commonly include this header in HTTP responses, where it contains the `WebID` of the authenticated user. An empty header usually means that the user is not authenticated.

Both Login and Signup functions return the user's WebID. Sometimes users don't have a WebID account, and in that case they need to sign up for one. The signup process also results in getting the user's WebID. If the opreation is successful and a WebID is returned, then the user is considered to be authenticated.

## Login example

Here is a typical example of authenticating a user and returning their WebID. The following `login` function, specific to your application, wraps the `Solid.auth.login` function. If the promise is resolved, then an application will do something with the `webid` value. Otherwise, if the promise is rejected, the application may choose to display an error message.

`HTML`

```html
<a href="#" onclick="login()">Login</a>
```

`JAVASCRIPT`

```javascript
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

## Signup example

The `signup` function is very similar to the `login` function, wrapping the `Solid.auth.signup` function. It results in either a WebID or an error message being returned.

`HTML`

```html
<a href="#" onclick="signup()">Sign up</a>
```

`JAVASCRIPT`

```javascript
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

## See also

[WebID](http://www.w3.org/2005/Incubator/webid/spec/identity)

[User header](https://github.com/solid/solid-spec#finding-out-the-identity-currently-used)
