import { renameGraph } from "./package/package"
import { parseTrigToStore, serializeTrigFromStore } from "./util/trigUtils"
import { DataFactory } from "n3"

async function runTest() {

    const profileText= `
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
    @prefix frapo: <http://purl.org/cerif/frapo/>.
    @prefix knows: <https://data.knows.idlab.ugent.be/person/office/#>.
    @prefix schema: <http://schema.org/>.
    @prefix space: <http://www.w3.org/ns/pim/space#>.
    @prefix ldp: <http://www.w3.org/ns/ldp#>.
    @prefix cv: <http://rdfs.org/resume-rdf/cv.rdfs#>.
    @prefix cvb: <http://rdfs.org/resume-rdf/base.rdfs#>.
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
    @prefix root: <https://pod.rubendedecker.be/>.
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

    <https://pod.rubendedecker.be/profile/card> a foaf:PersonalProfileDocument;
        foaf:maker <#me>;
        foaf:primaryTopic <#me>;
        rdfs:seeAlso <https://pod.rubendedecker.be/profile/card-private>, <https://pod.rubendedecker.be/profile/card-public>, <https://pod.rubendedecker.be/profile/cv-data>.
    <#me> a foaf:Person;
        solid:oidcIssuer <https://pod.rubendedecker.be/>;
        space:storage <https://pod.rubendedecker.be/>;
        ldp:inbox <https://pod.rubendedecker.be/inbox/>;
        foaf:name "Ruben Dedecker"@en;
        schema:name "Ruben Dedecker"@en;
        foaf:givenName "Ruben"@en;
        foaf:familyName "Dedecker"@en;
        foaf:age "27"^^xsd:integer;
        foaf:knows <https://patrickhochstenbach.net/profile/card#me>, <https://pietercolpaert.be/#me>, <https://ruben.verborgh.org/profile/#me>, <https://pieterheyvaert.com/#me>, <http://www.rubensworks.net/#me>, <http://ben.de-meester.org/#me>, <https://josd.github.io/card.ttl#me>, <https://solid.smessie.com/profile/card#me>;
        vcard:title "PhD Student".`



    let store = parseTrigToStore(profileText)
    let graph;
    ({ store, graph } = renameGraph(store, DataFactory.defaultGraph(), undefined, false))
    
    const trigString = await serializeTrigFromStore(store)


    console.log( trigString )
}

runTest()