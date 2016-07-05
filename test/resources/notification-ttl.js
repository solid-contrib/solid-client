module.exports = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix sioc: <http://rdfs.org/sioc/ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.

<>
  a solid:Notification;
  dcterms:title "Notification title";
  sioc:content "Notification contents";
  sioc:has_creator <#author>.

<#author> a sioc:UserAccount ;
  sioc:account_of <https://alice.example.com/profile/card#me>.
`
