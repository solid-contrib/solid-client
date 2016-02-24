/**
 * Sample LDNode Private Type Registry index resource,
 * for use with `identity-test.js`
 */
module.exports = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix sioc: <http://rdfs.org/sioc/ns#>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.

<> a solid:PrivateTypeIndex .

<#ab09cc> a solid:TypeRegistration;
    solid:forClass sioc:Post;
    solid:instanceContainer </posts/>.
`
