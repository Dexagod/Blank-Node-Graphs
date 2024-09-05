import { keyParams, signParams, signQuads } from "@jeswr/rdfjs-sign/dist"
import { PackOntology, SignOntology } from "../util/util"
import { Store, Quad_Graph, Quad_Object, Quad, DataFactory, Triple } from "n3"
import { RDF, XSD } from "@inrupt/vocab-common-rdf";
import { sign, webcrypto } from "crypto";

import { getResourceAsQuadArray, getResourceAsStore } from "@dexagod/rdf-retrieval"

const { namedNode, blankNode, literal, quad, defaultGraph, triple } = DataFactory;

export interface SignatureInfo {
    issuer: Quad_Object,
    proofValue: string,
    verificationMethod: string,
    cryptoSuite: string,
    target: Quad_Object,
    hashMethod: string,
    canonicalizationMethod?: string,
}

export interface SignatureOptions {
    privateKey: CryptoKey, 
    issuer: Quad_Object, 
    verificationMethod: string,
}


export function addSignatureGraphToStore( store: Store, signature: Triple[], graph?: Quad_Graph) {
    
    // Create graph to store signature information
    graph = graph || blankNode();
    store.addQuads(signature.map(t => quad(t.subject, t.predicate, t.object, graph)))   

    return { store, graph }
}

export function createSignatureTriples( signature: SignatureInfo ) {
    const { issuer, verificationMethod, cryptoSuite, proofValue, target, hashMethod, canonicalizationMethod } = signature;
    const signatureSubject = blankNode();
    const contentManipulationSubject = blankNode()

    const signatureTriples = [
        quad(signatureSubject, namedNode(RDF.type), namedNode(SignOntology.DataIntegrityProof)),
        quad(signatureSubject, namedNode(SignOntology.created), literal(new Date().toISOString(), XSD.dateTime)),
        quad(signatureSubject, namedNode(SignOntology.issuer), issuer),
        quad(signatureSubject, namedNode(SignOntology.cryptosuite), literal(cryptoSuite)),
        quad(signatureSubject, namedNode(SignOntology.verificationMethod), namedNode(verificationMethod)),
        quad(signatureSubject, namedNode(SignOntology.proofPurpose), literal("assertionMethod")),
        quad(signatureSubject, namedNode(SignOntology.proofValue), literal(proofValue)),
        quad(signatureSubject, namedNode(SignOntology.target), target as Quad_Object),

        // Content manipulation
        quad(signatureSubject, namedNode(SignOntology.contentManipulation), contentManipulationSubject),
        quad(contentManipulationSubject, namedNode(SignOntology.hashMethod), literal(hashMethod) ),
    ]
    if (canonicalizationMethod) signatureTriples.push(
        quad(contentManipulationSubject, namedNode(SignOntology.canonicalizationMethod), literal(canonicalizationMethod) )
    )

    return { subject: signatureSubject, triples: signatureTriples }
}

/**
 * Note that signing the default graph is not possible. 
 * Fist create a new graph with the same contents to sign.
 * 
 * @param store 
 * @param target 
 * @param signatureOptions 
 * @returns 
 */
export async function createRDFGraphSignature( store: Store, target: Quad_Graph, signatureOptions: SignatureOptions) {
    // Throw error on signing the default graph
    if (target.equals(defaultGraph())) throw new Error('Invalid signature target: cannot sign the default graph.')

    // Extract graph quads
    const graphQuads = store.getQuads(null, null, null, target)
    // Create signature graph
    const signatureInfo = await createSignatureForQuadArray(graphQuads, target as Quad_Object, signatureOptions)
    
    return signatureInfo
}

export async function createRDFDatasetSignature( store: Store, target: Quad_Object, signatureOptions: SignatureOptions) {
    // Extract contained graphs in dataset
    const containedGraphraphsInDataset = store.getQuads(target, PackOntology.contains, null, null).map(q => q.object)
    // Extract graph quads
    let combinedQuads: Quad[] = []
    for (let graphTerm of containedGraphraphsInDataset) {
        combinedQuads = combinedQuads.concat(store.getQuads(null, null, null, graphTerm))
    }
    const signatureInfo = await createSignatureForQuadArray(combinedQuads, target, signatureOptions)

    return signatureInfo
}

export async function createRemoteRDFSignature( url: string, signatureOptions: SignatureOptions) {
    const resourceQuads = await getResourceAsQuadArray(url) as Quad[]
    return createSignatureForQuadArray(resourceQuads, namedNode(url), signatureOptions );
}

export async function createRemoteRDFDatasetSignature( url: string, target: Quad_Object, signatureOptions: SignatureOptions) {
    const resourceStore = await getResourceAsStore(url)
    return createRDFDatasetSignature(resourceStore, target, signatureOptions)
}

async function createSignatureForQuadArray( quads: Quad[], target: Quad_Object, signatureOptions: SignatureOptions): Promise<SignatureInfo> {
    const { privateKey, issuer, verificationMethod } = signatureOptions;

    // Sign over graph quads
    const signature = await signQuads(quads, privateKey);

    return {
        issuer,
        proofValue: signature,
        verificationMethod: verificationMethod,
        cryptoSuite: keyParams.name, // todo: wtf do we do here?
        target,
        hashMethod: "SHA-512",
        canonicalizationMethod: "c14n",
    }
}

export async function createRemoteResourceSignature(url: string, signatureOptions: SignatureOptions) : Promise<SignatureInfo> {

    const {privateKey, issuer, verificationMethod} = signatureOptions;

    // create buffer from resource contents
    let content = await fetch(url)
    let contentBuffer = Buffer.from(await content.arrayBuffer())
    // hash content buffer using SHA-512
    const hash = await webcrypto.subtle.digest(signParams.hash, contentBuffer)    
    const signature = (await webcrypto.subtle.sign(signParams, privateKey, hash))
    const signatureString = Buffer.from(signature).toString('base64')
    
    return {
        issuer,
        proofValue: signatureString,
        verificationMethod: verificationMethod,
        cryptoSuite: keyParams.name,
        target: namedNode(url),
        hashMethod: signParams.hash,
    }
}