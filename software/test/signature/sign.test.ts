import { BlankNode, DataFactory, NamedNode, Store, Triple } from "n3";
import "jest-rdf";

const { namedNode, blankNode, literal, triple } = DataFactory;

describe('createSimplePolicy', () => {
    let store: Store;

    beforeEach(() => {
        store = new Store();
    });

    it('should create a policy with no duration or purpose', async () => {
        
    })
})
