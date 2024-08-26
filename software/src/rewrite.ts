import { DataFactory, Quad, Quad_Graph, Store, Term } from "n3";


/**
 * This function rewrites a graph in an RDF store to a new Blank Node Graph 
 * and provides a function to generate the metadata for this newly generated graph 
 * that will be stored in the default graph, or in the metadata graph when provided.
 * @param {Store} store 
 * @param {Quad_Graph} graphTerm 
 * @param {Quad_Graph} metadataGraph 
 * @param {(newGraphTerm: Term ) => Quad[ ]} generateGraphMetadata 
 * @returns {Term} Term of the newly created graph
 */
export function rewriteGraphContext( store: Store, graphTerm: Quad_Graph, metadataGraph?: Quad_Graph, generateGraphMetadata?: ( newGraphTerm: Term ) => Quad[] ) {
    
    // Create Blank Node term for the new graph
    const newBNGTerm = DataFactory.blankNode();
    // extract all quads from the previous graph
    let quads = store.getQuads(null, null, null, graphTerm)
    // delete the old graph
    store.deleteGraph(graphTerm);
    // create new graph quads
    const newGraphQuads = quads.map(q => DataFactory.quad(q.subject, q.predicate, q.object, newBNGTerm))
    // add new graph quads
    store.addQuads(newGraphQuads)
    return newBNGTerm;
}