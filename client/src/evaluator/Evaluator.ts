import { Quad, Store } from "n3";
import { generateVerificationTriplesFromVerificationResult, verifyAllSignatures } from "../../../software/src/"

class Session {

    additions: Quad[];
    deletions: Quad[];    

    constructor() {
        this.additions = []
        this.deletions = []
    }

    addQuads(quads: Quad[]) {
        this.additions = this.additions.concat(quads)
    }

    removeQuads(quads: Quad[]) {
        this.deletions = this.deletions.concat(quads)
    }

    commitToStore(store: Store) {
        store.addQuads(this.additions)
        store.removeQuads(this.deletions)
        return store
    }
}



export class Evaluator {
    
    store: Store;
    session: undefined | Session;
    token: string;
    
    constructor(store: Store, token: string) {
        this.store = store;
        this.token = token;
        this.session = undefined;
    }

    startSession() {
        if (this.session !== undefined) throw new Error('Commit the previous session before opening a new one.')
        this.session = new Session()
    }

    commitSession() {
        if (this.session === undefined) throw new Error('Cannot commit empty session.')
        this.store = this.session.commitToStore(this.store)
        this.session = undefined;
    }

    async evaluateSignatures() {
        const verificationResults = await verifyAllSignatures(this.store);
        for (let result of verificationResults) {
            const triples = generateVerificationTriplesFromVerificationResult(result, this.token);
        }
    }
}


