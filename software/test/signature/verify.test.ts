import { BlankNode, DataFactory, NamedNode, Store, Triple, Quad_Graph } from "n3";
import "jest-rdf";
import { addSignatureGraphToStore, createDatasetFromGraphsInStore, createRDFDatasetSignature, createRDFGraphSignature, createSignatureTriples, renameGraph, SignatureInfo, verifyAllSignatures, verifySignature } from "../../src";
import { parseTrigToStore, serializeTrigFromStore } from "../../src/util/trigUtils";
import { generateKeyPair, importKey, importPrivateKey, verifyQuads } from "@jeswr/rdfjs-sign/dist";
import { sign, webcrypto } from "crypto";

const { namedNode, blankNode, literal, triple } = DataFactory;

describe('createSimplePolicy', () => {
    let store: Store;
    let graph: Quad_Graph;
    let id: BlankNode;
    let publicKey: CryptoKey;
    let privateKey: CryptoKey;
    let publicKeyResource: string;
    // let keyPair: CryptoKeyPair;

    const document = `@prefix foaf: <http://xmlns.com/foaf/0.1/>.
<https://example.org/profile/card#me> a foaf:Person;
    foaf:name "Bob".`


    beforeEach(async() => {

        store = await parseTrigToStore(document);
        // keyPair = await generateKeyPair();

        ({store, graph} = renameGraph(store, DataFactory.defaultGraph()));
        ({store, id} = createDatasetFromGraphsInStore(store, [graph as BlankNode]));

        publicKeyResource = "https://pod.rubendedecker.be/keys/test_public"
        const privateKeyResource = "https://pod.rubendedecker.be/keys/test_private"
        // Testing key retrieval for myself
        const publicKeyText = await (await fetch(publicKeyResource)).text()
        const privateKeyJSON = await (await fetch(privateKeyResource)).json()
        
        publicKey = await importKey((publicKeyText))
        privateKey = await importPrivateKey(privateKeyJSON as webcrypto.JsonWebKey)

        const graphSignatureOptions = {
            privateKey: privateKey,
            issuer: namedNode('https://example.org/profile/card#me'),
            verificationMethod: publicKeyResource,
            metadataGraph: blankNode('graph_signature')
        }
        const datasetSignatureOptions = {
            privateKey: privateKey,
            issuer: namedNode('https://example.org/profile/card#me'),
            verificationMethod: publicKeyResource,
            metadataGraph: blankNode('dataset_signature')
        }

        const graphSignatureInfo = await createRDFGraphSignature(store, graph as BlankNode, graphSignatureOptions)
        const graphSignatureTriples = createSignatureTriples(graphSignatureInfo).triples
        const graphSignatureGraph = addSignatureGraphToStore(store, graphSignatureTriples).graph

        const datasetSignatureInfo = await createRDFDatasetSignature(store, id, datasetSignatureOptions)
        const datasetSignatureTriples = createSignatureTriples(datasetSignatureInfo).triples
        const datasetSignatureGraph = addSignatureGraphToStore(store, datasetSignatureTriples).graph
    });

    // it('should verify an RDF graph with a remote public key resource', async () => {

    
    //     const verification = await verifySignature(store, {
    //         target: graph,
    //         canonicalizationMethod: "c14n",
    //         hashMethod: "SHA-512"
    //     } as SignatureInfo)
        
    //     expect(verification.result).toBe(true)

        
    // })

    // it('should verify an RDF dataset with a remote public key resource', async () => {

    //     const verification = await verifySignature(store, {
    //         target: id,
    //         canonicalizationMethod: "c14n",
    //         hashMethod: "SHA-512"
    //     } as SignatureInfo)

    //     expect(verification.result).toBe(true)
        
    // })

    it('should verify all signatures in a store with a remote public key resource', async () => {
        const verifications = await verifyAllSignatures(store);
        for (let verification of verifications) {
            expect(verification.result).toBe(true)
        }
    })
})