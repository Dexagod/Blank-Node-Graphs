import { DataFactory, Quad_Graph, Quad_Object, Store } from "n3";
import { RDFContainsURI, RDFDatasetURI } from "../util/util";
import { RDF } from "@inrupt/vocab-common-rdf";

const { namedNode, blankNode, literal, quad, defaultGraph, triple } = DataFactory;

/**
 * This function adds the dataset triples in the default graph to the store, and returns the updated store. 
 * This changes the store passed as argument, so in case this one should not be changed, clone the store object before calling the function.
 * @param graphTerms term of the graph (blank node or named node) that need to be added as contained by the dataset
 * @param store quad store
 * @returns 
 */
export function createDatasetFromGraphsInStore( store: Store, graphTerms: Quad_Graph[], metadataGraph?: Quad_Graph): Store {

    const datasetSubject = blankNode()
    const containingGraphTerm = metadataGraph ?  namedNode(metadataGraph.value) : defaultGraph()
    const datasetQuads = [
        quad(datasetSubject, namedNode(RDF.type), namedNode(RDFDatasetURI), containingGraphTerm)
    ]
    for (let graphTerm of graphTerms) {
        if (graphTerm.equals(defaultGraph())) {
            throw new Error('Error creating dataset from graphs: cannot reference the default graph in local scope. Please rename the default graph first.')
        }
        datasetQuads.push(quad(datasetSubject, namedNode(RDFContainsURI), graphTerm as Quad_Object, containingGraphTerm ))
    }
    store.addQuads(datasetQuads)

    return store
}

export function renameGraph( store: Store, source: Quad_Graph, target?: Quad_Graph, retainOriginal?: boolean  ) {
    target = target || blankNode()
    retainOriginal = !!retainOriginal
    const matchingQuads = store.match(null, null, null, source)
    for (const matchedQuad of matchingQuads) {
        store.addQuad(quad(matchedQuad.subject, matchedQuad.predicate, matchedQuad.object, target))
        if (!retainOriginal) store.removeQuad(matchedQuad)
    }
    return { store, graph: target}   
}

