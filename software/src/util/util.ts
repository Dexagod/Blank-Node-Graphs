import { RDF } from "@inrupt/vocab-common-rdf";
import { BlankNode, DataFactory, Quad, Quad_Graph, Store, Term, Triple } from "n3";
import { v4 as uuidv4 } from 'uuid';
import { renameGraph } from "../package/package";
import moment from "moment";
import { NamedNode, Quad_Object } from "rdf-js";

const { namedNode, blankNode, literal, quad, defaultGraph, triple } = DataFactory;

const SIGNATUREONTOLOGYNAMESPACE = 'https://example.org/ns/sign/'
const PACKAGEONTOLOGYNAMESPACE= 'https://example.org/ns/pack/'

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