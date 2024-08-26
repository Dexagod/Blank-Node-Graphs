import { Quad, Store, DataFactory, Quad_Object, Quad_Graph } from "n3"
import { RDF } from "@inrupt/vocab-common-rdf"
import { checkContainmentType, ContainmentType, RDFContainsURI, RDFDatasetURI, rewriteGraphContext } from "./util"


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

export function setSignature( store: Store, term: Quad_Graph ) {
    switch (checkContainmentType(store, term)) {
        case ContainmentType.Dataset:
            return setSignatureForDataset()
        case ContainmentType.Graph:
            return setSignatureForGraph()
        default:
            throw new Error(`Attempting to set a signature over ${term.value}, which is neither an RDF Graph nor an RDF Dataset.`)
    }
}

function setSignatureForGraph( store: Store, term: Quad_Graph,  ) {

}

function setSignatureForDataset() {

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




