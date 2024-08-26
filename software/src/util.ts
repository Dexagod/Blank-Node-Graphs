import { RDF } from "@inrupt/vocab-common-rdf";
import { DataFactory, Quad, Quad_Graph, Store, Term, Triple } from "n3";

export const RDFDatasetURI = RDF.NAMESPACE+"Dataset"
export const RDFContainsURI = RDF.NAMESPACE+"contains"

export enum ContainmentType {
    Dataset,
    Graph,
    Other
}

export function checkContainmentType(store: Store, term: Term): ContainmentType {
    if (store.getQuads(null, null, null, term).length !== 0) {
        return ContainmentType.Graph
    } else if (store.getQuads(null, RDF.type, RDFDatasetURI, null)) {
        return ContainmentType.Dataset
    }
    return ContainmentType.Other
}



/**
 * This function rewrites a graph in an RDF store to a new Blank Node Graph 
 * and provides a function to generate the metadata for this newly generated graph 
 * that will be stored in the default graph, or in the metadata graph when provided.
 * @param {Store} store 
 * @param {Quad_Graph} graphTerm 
 * @param {Quad_Graph} metadataGraph This term is the graph in which the newly generated metadata will be placed. Defaults to the default graph when undefined.
 * @param {(newGraphTerm: Term ) => Quad[ ]} generateGraphMetadata This function generates the metadata for the newly generated graph that needs to be added.
 * @returns {Term} Term of the newly created graph
 */
export function rewriteGraphContext( store: Store, graphTerm: Quad_Graph, metadataGraph?: Quad_Graph, generateGraphMetadata?: ( newGraphTerm: Term ) => Triple[] ) {
    
    // Create Blank Node term for the new graph
    const newBNGTerm = DataFactory.blankNode();
    // Extract all quads from the previous graph
    let quads = store.getQuads(null, null, null, graphTerm)
    // Delete the old graph
    store.deleteGraph(graphTerm);
    // Create new graph quads
    const newGraphQuads = quads.map(q => DataFactory.quad(q.subject, q.predicate, q.object, newBNGTerm))
    // Add new graph quads
    store.addQuads(newGraphQuads)

    // If there is a function to generate metadata
    if (generateGraphMetadata) {
        // Generate metadata triples
        const metadataTriples = generateGraphMetadata(newBNGTerm)
        // Create the graph to store the metadata triples in
        metadataGraph = metadataGraph || DataFactory.defaultGraph()
        // Convert the triples to quads
        const metadataQuads = metadataTriples.map(triple => DataFactory.quad(triple.subject, triple.predicate, triple.object, metadataGraph))
        // Add them to the store
        store.addQuads(metadataQuads)
    }

    // Return newly generated graph term
    return newBNGTerm;
}