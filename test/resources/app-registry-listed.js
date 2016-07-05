/**
 * Sample public AppRegistry resource
 */
module.exports = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix app: <http://www.w3.org/ns/solid/app#>.
@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.

<>
  a solid:AppRegistry;
  a solid:ListedDocument.
<#iTsLp>
  a solid:AppRegistration;
  app:commonType vcard:AddressBook;
  app:name "Contact Manager";
  app:shortdesc "A reference contact manager";
  app:redirectTemplateUri "https://solid.github.io/contacts/?uri={uri}".
`
