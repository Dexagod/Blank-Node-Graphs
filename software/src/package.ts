import { Quad, Store, DataFactory, Quad_Object, Quad_Graph, Term } from "n3"
import { RDF, XSD } from "@inrupt/vocab-common-rdf"
import { checkContainmentType, ContainmentType, CRYPTOSUITE, RDFContainsURI, RDFDatasetURI, rewriteGraphContext, SignOntology } from "./util"


import {
    generateKeyPair, exportKey, signQuads, verifyQuads, importKey,
  } from '@jeswr/rdfjs-sign';
  
const quad = DataFactory.quad;
const nn = DataFactory.namedNode;
const bn = DataFactory.blankNode;
const lit = DataFactory.literal;

/**
 * This function adds the dataset triples in the default graph to the store, and returns the updated store. 
 * This changes the store passed as argument, so in case this one should not be changed, clone the store object before calling the function.
 * @param graphTerms term of the graph (blank node or named node) that need to be added as contained by the dataset
 * @param store quad store
 * @returns 
 */
export function packageGraphsAsDataset( store: Store, graphTerms: Quad_Graph[], metadataGraph?: Quad_Graph): Quad[] {

    const datasetSubject = DataFactory.blankNode()
    const containingGraphTerm = metadataGraph ?  DataFactory.namedNode(metadataGraph.value) : DataFactory.defaultGraph()
    const datasetQuads = [
        DataFactory.quad(datasetSubject, DataFactory.namedNode(RDF.type), DataFactory.namedNode(RDFDatasetURI), containingGraphTerm)
    ]
    for (let graphTerm of graphTerms) {
        if (graphTerm === DataFactory.defaultGraph()) {
            // We cannot contain the default graph in an in-resource rdf dataset
            const newGraphTerm = rewriteGraphContext(store, graphTerm)
            datasetQuads.push(DataFactory.quad(datasetSubject, DataFactory.namedNode(RDFContainsURI), newGraphTerm, containingGraphTerm ))
        } else {
            datasetQuads.push(DataFactory.quad(datasetSubject, DataFactory.namedNode(RDFContainsURI), graphTerm as Quad_Object, containingGraphTerm ))
        }
    }

    return []
}

export async function setSignature( store: Store, term: Quad_Graph, issuer: Quad_Object, privateKey: CryptoKey, verificationMethod: Quad_Object  ) {
    switch (checkContainmentType(store, term)) {
        case ContainmentType.Dataset:
            return setSignatureForDataset(store, term, issuer, privateKey, verificationMethod)
        case ContainmentType.Graph:
            return setSignatureForGraph(store, term, issuer, privateKey, verificationMethod)
        default:
            throw new Error(`Attempting to set a signature over ${term.value}, which is neither an RDF Graph nor an RDF Dataset.`)
    }
}

async function setSignatureForGraph( store: Store, term: Quad_Graph, issuer: Quad_Object, privateKey: CryptoKey, verificationMethod: Quad_Object  ) {
    
    // Extract graph quads
    const graphQuads = store.getQuads(null, null, null, term)
    // Create signature graph
    const { subject, graph: signatureGraphTerm, quads: signatureQuads } = await createSignatureForQuadArray(graphQuads, term, issuer, privateKey, verificationMethod)
    // Add signature to store
    store.addQuads(signatureQuads);
    
    // return signature graph term
    return signatureGraphTerm
}

async function setSignatureForDataset( store: Store, term: Quad_Graph, issuer: Quad_Object, privateKey: CryptoKey, verificationMethod: Quad_Object  ) {

    // Extract contained graphs in dataset
    const containedGraphsInDataset = store.getQuads(term, RDFContainsURI, null, null).map(q => q.object)
    // Extract graph quads
    let combinedQuads: Quad[] = []
    for (let graphTerm of containedGraphsInDataset) {
        combinedQuads = combinedQuads.concat(store.getQuads(null, null, null, graphTerm))
    }
    const { subject, graph: signatureGraphTerm, quads: signatureQuads } = await createSignatureForQuadArray(combinedQuads, term, issuer, privateKey, verificationMethod)
    // Add signature to store
    store.addQuads(signatureQuads);
    
    // return signature graph term
    return signatureGraphTerm

}

async function createSignatureForQuadArray( quads: Quad[], term: Quad_Graph, issuer: Quad_Object, privateKey: CryptoKey, verificationMethod: Quad_Object  ) {

    // Sign over graph quads
    const signature = await signQuads(quads, privateKey);


    // Create graph to store signature information
    const signatureGraph = DataFactory.blankNode();
    const signatureSubject = DataFactory.blankNode();
    const contentManipulationSubject = DataFactory.blankNode()

    const signatureGraphQuads = [
        quad(signatureSubject, nn(RDF.type), nn(SignOntology.DataIntegrityProof), signatureGraph),
        quad(signatureSubject, nn(SignOntology.created), lit(new Date().toISOString(), XSD.dateTime), signatureGraph),
        quad(signatureSubject, nn(SignOntology.issuer), issuer, signatureGraph),
        quad(signatureSubject, nn(SignOntology.cryptosuite), lit(CRYPTOSUITE), signatureGraph),
        quad(signatureSubject, nn(SignOntology.verificationMethod), verificationMethod, signatureGraph),
        quad(signatureSubject, nn(SignOntology.proofPurpose), lit("assertionMethod"), signatureGraph),
        quad(signatureSubject, nn(SignOntology.proofValue), lit(signature), signatureGraph),
        quad(signatureSubject, nn(SignOntology.target), term as Quad_Object, signatureGraph),

        // Content manipulation
        quad(signatureSubject, nn(SignOntology.contentManipulation), contentManipulationSubject, signatureGraph),
        quad(contentManipulationSubject, nn(SignOntology.hashMethod), lit("SHA-1") , signatureGraph),
        quad(contentManipulationSubject, nn(SignOntology.canonicalizationMethod), lit("SHA-C14N") , signatureGraph),
    ]

    return { subject: signatureSubject, graph: signatureGraph, quads: signatureGraphQuads } ;
}

export function setPolicy( store: Store, term: Quad_Graph ) {
    switch (checkContainmentType(store, term)) {
        case ContainmentType.Dataset:
            return setPolicyForDataset()
        case ContainmentType.Graph:
            return setPolicyForGraph()
        default:
            throw new Error(`Attempting to set a signature over ${term.value}, which is neither an RDF Graph nor an RDF Dataset.`)
    }

}

function setPolicyForGraph() {

}

function setPolicyForDataset() {

}

export function setProvenance( store: Store, term: Quad_Graph ) {
    switch (checkContainmentType(store, term)) {
        case ContainmentType.Dataset:
            return setProvenanceForDataset()
        case ContainmentType.Graph:
            return setProvenanceForGraph()
        default:
            throw new Error(`Attempting to set a signature over ${term.value}, which is neither an RDF Graph nor an RDF Dataset.`)
    }

}

function setProvenanceForGraph() {

}

function setProvenanceForDataset() {

}




