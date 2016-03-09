/**
 * Sample LDNode Public Type Registry index resource,
 * for use with `identity-test.js`
 */
module.exports = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.

<>
  a solid:TypeIndex ;
  a solid:ListedDocument.

<#ab09fd> a solid:TypeRegistration;
    solid:forClass vcard:AddressBook;
    solid:instance </contacts/addressBook.ttl>.
`
