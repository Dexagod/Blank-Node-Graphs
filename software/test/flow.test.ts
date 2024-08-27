import { BlankNode, DataFactory, NamedNode, Store, Triple } from "n3";
import { ODRL, RDF, XSD } from "@inrupt/vocab-common-rdf";
import { Quad_Subject } from "rdf-js";
import "jest-rdf";
import { parseTrigToStore, serializeTrigFromStore } from "../src/util/trigUtils";
import { addPolicyGraphToStore, addProvenanceGraphToStore, addSignatureGraphToStore, createDatasetFromGraphsInStore, createProvenanceTriples, createRDFDatasetSignature, createSignatureTriples, createSimplePolicy, renameGraph } from "../src";
import { exportKey, exportPrivateKey, generateKeyPair, importKey, importPrivateKey } from "@jeswr/rdfjs-sign/dist";
import { webcrypto } from "crypto";

const { namedNode, blankNode, literal, triple } = DataFactory;

describe('createSimplePolicy', () => {
    let store: Store;

    beforeEach(() => {
        store = new Store();
    });

    it('should create a policy with no duration or purpose', async () => {
        
        let rubenProfileDoc = `
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
<https://pod.rubendedecker.be/profile/card> a foaf:PersonalProfileDocument;
    foaf:maker <#me>;
    foaf:primaryTopic <#me>.
<#me> a foaf:Person;
    foaf:name "Ruben D."@en;
    foaf:age "28"^^xsd:integer;
    foaf:img <https://pod.rubendedecker.be/profile/image.png>;
    foaf:knows <https://patrickhochstenbach.net/profile/card#me>, <https://pietercolpaert.be/#me>, <https://ruben.verborgh.org/profile/#me>,  <https://josd.github.io/card.ttl#me>.`
        
    let josProfileDoc = `
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

<#me> a foaf:Person;
    foaf:name "Jos DR";
    foaf:img <https://josd.github.io/images/jdroo.jpg>;
    foaf:homepage <https://josd.github.io/>.`

    // Load Ruben's document, change the graph 
    let rubenProfileStore = parseTrigToStore(rubenProfileDoc)
    let rubenProfileGraph;
    const renamed = renameGraph( rubenProfileStore, DataFactory.defaultGraph() )
    rubenProfileStore = renamed.store
    rubenProfileGraph = renamed.graph as BlankNode
    store.addQuads(rubenProfileStore.getQuads(null, null, null, null))


    let josProfileStore = parseTrigToStore(josProfileDoc)
    let josProfileGraph;
    const renamed2 = renameGraph( josProfileStore, DataFactory.defaultGraph() )
    josProfileStore = renamed2.store
    josProfileGraph = renamed2.graph as BlankNode
    store.addQuads(josProfileStore.getQuads(null, null, null, null))

    
    const rubenProvenanceTriples = createProvenanceTriples({target: rubenProfileGraph, origin: "https://pod.rubendedecker.be/profile/card", issuer: "https://pod.rubendedecker.be/profile/card#me"})
    const rubenProvenanceGraph = addProvenanceGraphToStore(store, rubenProvenanceTriples.triples).graph
    
    const josProvenanceTriples = createProvenanceTriples({target: josProfileGraph, origin: "https://josd.github.io/card.ttl", issuer: "https://josd.github.io/card.ttl#me"})
    const josProvenanceGraph = addProvenanceGraphToStore(store, josProvenanceTriples.triples).graph

    const rubenPolicyTriples = createSimplePolicy({ target: rubenProfileGraph, assigner: "https://pod.rubendedecker.be/profile/card#me", duration: "P1Y", purpose: "https://w3id.org/dpv#ServiceProvision"})
    const rubenPolicyGraph = addPolicyGraphToStore(store, rubenPolicyTriples.triples).graph

    const josPolicyTriples = createSimplePolicy({ target: josProfileGraph, assigner: "https://josd.github.io/card.ttl#me", duration: "P1M", purpose: "https://w3id.org/dpv#ServiceProvision"})
    const josPolicyGraph = addPolicyGraphToStore(store, josPolicyTriples.triples).graph

    const datasetURI = createDatasetFromGraphsInStore(store, [rubenProfileGraph, rubenProvenanceGraph, rubenPolicyGraph, josProfileGraph, josProvenanceGraph, josPolicyGraph]).id
    
    // Testing key retrieval for myself
    const publicKeyText = await (await fetch("https://pod.rubendedecker.be/keys/test_public")).text()
    const privateKeyJSON = await (await fetch("https://pod.rubendedecker.be/keys/test_private")).json()
    
    const publicKey = await importKey((publicKeyText))
    const privateKey = await importPrivateKey(privateKeyJSON as webcrypto.JsonWebKey)

    const signatureInfo = await createRDFDatasetSignature(store, datasetURI, { privateKey, issuer: "https://pod.rubendedecker.be/profile/card", verificationMethod: "https://pod.rubendedecker.be/keys/publicKey"})
    const signatureTriples = createSignatureTriples(signatureInfo).triples
    const signatureGraph = addSignatureGraphToStore(store, signatureTriples).graph
    // const signature

    console.log(await serializeTrigFromStore(store))

    
    
    })
});
