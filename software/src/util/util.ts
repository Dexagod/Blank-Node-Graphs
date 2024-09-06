import { RDF } from "@inrupt/vocab-common-rdf";
import { BlankNode, DataFactory, Quad, Quad_Graph, Store, Term, NamedNode, Quad_Object, Triple } from "n3";
import { v4 as uuidv4 } from 'uuid';
import { renameGraph } from "../package/package";
import moment from "moment";
import { Quad_Subject } from "rdf-js";

const { namedNode, blankNode, literal, quad, defaultGraph, triple } = DataFactory;

const SIGNATUREONTOLOGYNAMESPACE = 'https://example.org/ns/sign/'
const PACKAGEONTOLOGYNAMESPACE= 'https://example.org/ns/pack/'
const VERIFICATIONONTOLOGYNAMESPACE = 'https://example/org/ns/verify/'

export const SignOntology = {
    NAMESPACE: SIGNATUREONTOLOGYNAMESPACE,
    DataIntegrityProof: SIGNATUREONTOLOGYNAMESPACE+"DataIntegrityProof",
    created:  SIGNATUREONTOLOGYNAMESPACE+"created",
    issuer:  SIGNATUREONTOLOGYNAMESPACE+"issuer",
    cryptosuite:  SIGNATUREONTOLOGYNAMESPACE+"cryptosuite",
    verificationMethod:  SIGNATUREONTOLOGYNAMESPACE+"verificationMethod",
    proofPurpose:  SIGNATUREONTOLOGYNAMESPACE+"proofPurpose",
    proofValue:  SIGNATUREONTOLOGYNAMESPACE+"proofValue",
    contentManipulation:  SIGNATUREONTOLOGYNAMESPACE+"contentManipulation",
    target:  SIGNATUREONTOLOGYNAMESPACE+"target",
    hashMethod:  SIGNATUREONTOLOGYNAMESPACE+"hashMethod",
    canonicalizationMethod: SIGNATUREONTOLOGYNAMESPACE+"canonicalizationMethod",
}

export const PackOntology = {
    NAMESPACE: PACKAGEONTOLOGYNAMESPACE,
    timestamp: PACKAGEONTOLOGYNAMESPACE+"timestamp",
    origin: PACKAGEONTOLOGYNAMESPACE+"origin",
    issuer: PACKAGEONTOLOGYNAMESPACE+"issuer",
    Dataset: PACKAGEONTOLOGYNAMESPACE+"Dataset",
    contains: PACKAGEONTOLOGYNAMESPACE+"contains",
}

export const VerificationOntology = {
    NAMESPACE: VERIFICATIONONTOLOGYNAMESPACE,
    VerificationStatus: VERIFICATIONONTOLOGYNAMESPACE+"VerificationStatus",
    status: VERIFICATIONONTOLOGYNAMESPACE+"status",
    issuer: VERIFICATIONONTOLOGYNAMESPACE+"issuer",
    verifies: VERIFICATIONONTOLOGYNAMESPACE+"verifies",
    trustedToken: VERIFICATIONONTOLOGYNAMESPACE+"trustedToken"
}

export enum ContainmentType {
    Dataset,
    Graph,
    Other
}

export function checkContainmentType(store: Store, term: Term): ContainmentType {
    if (store.getQuads(null, null, null, term).length !== 0) {
        return ContainmentType.Graph
    } else if (store.getQuads(null, RDF.type, PackOntology.Dataset, null)) {
        return ContainmentType.Dataset
    }
    return ContainmentType.Other
}

export function generateUrnUuid() {
    return DataFactory.namedNode(`urn:policy:${uuidv4()}`)
}

export function getDatasetGraphQuads(store: Store, dataset: BlankNode | NamedNode) {
    if(!store.getQuads(dataset, RDF.type, PackOntology.Dataset, null).length) {
        throw new Error('Incorrect dataset reference passed for given store.')
    }

    const graphIds = store.getQuads(dataset, PackOntology.contains, null, null).map(quad => quad.object)
    let quads: Quad[] = []
    for (let graphId of graphIds) {
        quads = quads.concat(store.getQuads(null, null, null, graphId))
    }
    return quads
}

export function createRDFList(terms: Quad_Object[]): { subject: BlankNode | undefined, quads: Quad[]} {
    const quads: Quad[] = [];

    let list;
    let first;
    let rest: Quad_Object = namedNode(RDF.nil);

    for (let i = terms.length-1; i >= 0; i--) {
        list = blankNode();
        first = terms[i]
        // push rest
        quads.push(quad(list, namedNode(RDF.rest), rest))
        // push first
        quads.push(quad(list, namedNode(RDF.first), first as Quad_Object))
        rest = list;
    }
        
    return { subject: list, quads: quads, };
}

export function unpackRDFList(store: Store, base: Quad_Subject, graph?: Quad_Graph | null): Quad_Object[] {
    graph = graph || null
    const first = store.getQuads(base, RDF.first, null, graph).map(q => q.object)
    const rest = store.getQuads(base, RDF.rest, null, graph).map(q => q.object)
    if (first.length && first.length !== 1) { throw new Error(`Malformed list at base ${base}`) }
    if (rest.length && rest.length !== 1) { throw new Error(`Malformed list at base ${base}`) }
    if (rest[0].equals(namedNode(RDF.nil))) return [ first[0] ]
    else return [ first [0] ].concat(unpackRDFList(store, rest[0] as Quad_Subject, graph))
}

export function renameAllGraphsInStore(store: Store, strategy?: (graphName: Quad_Graph) => { graphName: NamedNode | BlankNode, metadata?: Quad[] }) {
    const storeGraphs = store.getGraphs(null, null, null)
    const graphList = [... new Set(storeGraphs)]

    const defaultStrategy = (graphName: Quad_Graph) => { 
        const bn = blankNode();
        return  { graphName: bn } 
    }
    let newDefaultGraph: undefined | NamedNode | BlankNode;
    
    if (!strategy) strategy = defaultStrategy

    for (let graphTerm of graphList) {
        const { graphName, metadata } = strategy(graphTerm)
        const renamed = renameGraph(store, graphTerm, graphName)
        if (metadata) store.addQuads(metadata)
            
        if (graphTerm.equals(DataFactory.defaultGraph()))
            newDefaultGraph = renamed.graph;
    }

    return { store, defaultGraph: newDefaultGraph }
}