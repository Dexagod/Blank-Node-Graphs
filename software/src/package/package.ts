import { BlankNode, DataFactory, NamedNode, Quad_Graph, Quad_Object, Store } from "n3";
import { PackOntology } from "../util/util";
import { RDF } from "@inrupt/vocab-common-rdf";

const { namedNode, blankNode, literal, quad, defaultGraph, triple } = DataFactory;

/**
 * This function adds the dataset triples in the default graph to the store, and returns the updated store. 
 * This changes the store passed as argument, so in case this one should not be changed, clone the store object before calling the function.
 * @param graphTerms term of the graph (blank node or named node) that need to be added as contained by the dataset
 * @param store quad store
 * @returns 
 */
export function createDatasetFromGraphsInStore( store: Store, graphTerms: Quad_Graph[], metadataGraph?: Quad_Graph) {

    const datasetSubject = blankNode()
    const containingGraphTerm = metadataGraph ?  namedNode(metadataGraph.value) : defaultGraph()
    const datasetQuads = [
        quad(datasetSubject, namedNode(RDF.type), namedNode(PackOntology.Dataset), containingGraphTerm)
    ]
    for (let graphTerm of graphTerms) {
        if (graphTerm.equals(defaultGraph())) {
            throw new Error('Error creating dataset from graphs: cannot reference the default graph in local scope. Please rename the default graph first.')
        }
        datasetQuads.push(quad(datasetSubject, namedNode(PackOntology.contains), graphTerm as Quad_Object, containingGraphTerm ))
    }
    store.addQuads(datasetQuads)

    return { store, graph: containingGraphTerm, id: datasetSubject }
}

/**
 * renames graph for all quads containing the graph as the graph name, as well as all quads containing the graph as a subject or object value
 * @param store 
 * @param source 
 * @param target 
 * @param retainOriginal 
 * @returns 
 */
export function renameGraph( store: Store, source: Quad_Graph, target?: NamedNode | BlankNode, retainOriginal?: boolean  ) {
    target = target || blankNode()
    retainOriginal = !!retainOriginal

    // rename graph at graph position
    const matchingQuads = store.match(null, null, null, source)
    for (const matchedQuad of matchingQuads) {
        store.addQuad(quad(matchedQuad.subject, matchedQuad.predicate, matchedQuad.object, target))
        if (!retainOriginal) store.removeQuad(matchedQuad)
    }

    // rename graph at object position
    const matchingQuads2 = store.match(null, null, source, null)
    for (const matchedQuad of matchingQuads2) {
        store.addQuad(quad(matchedQuad.subject, matchedQuad.predicate, target, matchedQuad.graph))
        if (!retainOriginal) store.removeQuad(matchedQuad)
    }
    
    // rename graph at subject position
    const matchingQuads3 = store.match(source, null, null, null)
    for (const matchedQuad of matchingQuads3) {
        store.addQuad(quad(target, matchedQuad.predicate, matchedQuad.object, matchedQuad.graph))
        if (!retainOriginal) store.removeQuad(matchedQuad)
    }
    return { store, graph: target}   
}



export function createDatasetQuads( store: Store, graphTerms: Quad_Graph[], metadataGraph?: Quad_Graph) {

    const datasetSubject = blankNode()
    const containingGraphTerm = metadataGraph ?  namedNode(metadataGraph.value) : defaultGraph()
    const datasetQuads = [
        quad(datasetSubject, namedNode(RDF.type), namedNode(PackOntology.Dataset), containingGraphTerm)
    ]
    for (let graphTerm of graphTerms) {
        if (graphTerm.equals(defaultGraph())) {
            throw new Error('Error creating dataset from graphs: cannot reference the default graph in local scope. Please rename the default graph first.')
        }
        datasetQuads.push(quad(datasetSubject, namedNode(PackOntology.contains), graphTerm as Quad_Object, containingGraphTerm ))
    }

    return { quads: datasetQuads, graph: containingGraphTerm, id: datasetSubject }
}