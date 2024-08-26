import { DataFactory, NamedNode, Store, Triple } from "n3";
import { ODRL, RDF, XSD } from "@inrupt/vocab-common-rdf";
import { Quad_Subject } from "rdf-js";
import "jest-rdf";

const { namedNode, blankNode, literal, triple } = DataFactory;


describe('createSimplePolicy', () => {
    let store: Store;

    beforeEach(() => {
        store = new Store();
    });
    
    it('should create a policy with no duration or purpose', () => {
        

    });
});
