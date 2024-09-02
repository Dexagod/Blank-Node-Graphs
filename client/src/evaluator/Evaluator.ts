import { Quad, Store, Quad_Subject, Quad_Object, Quad_Graph } from "n3";
import { checkContainmentType, ContainmentType, generateVerificationTriplesFromVerificationResult, PackOntology, serializeTrigFromStore, VerificationOntology, verifyAllSignatures } from "../../../software/src/"
import { XSD } from "@inrupt/vocab-common-rdf";

import { DataFactory } from "../../../software/src";
const { namedNode, blankNode, literal, quad } = DataFactory

const LOCALONTOLOGYNAMESPACE = "https://example.org/ns/local/"

const LocalOntology = {
    NAMESPACE: LOCALONTOLOGYNAMESPACE,
    hasTag: LOCALONTOLOGYNAMESPACE+"hasTag",
    SignatureValidated: LOCALONTOLOGYNAMESPACE+"SignatureValidated",
    ProvenanceValidated: LOCALONTOLOGYNAMESPACE+"ProvenanceValidated",
    PolicyValidated: LOCALONTOLOGYNAMESPACE+"hasTag",
}

class Session {

    private taskList: ((store: Store) => Promise<Store>)[]
    private requiredTags: string[] = [];

    constructor() {
        this.taskList = []
    }

    addAsyncTask(task: (store: Store) => Promise<Store>) {
        this.taskList.push(task)
    }
    
    addTag(tag: string) { this.requiredTags.push(tag)}

    async commitToStore(store?: Store) {
        store = store || new Store()
        for (let task of this.taskList) {
            store = await task(store)
        }

        // Store is in final configuration

        if (this.requiredTags.length === 0) { 
            return store
        }

        // Check the required operations to be done 

        let graphs = store.getGraphs(null, null, null)
        for (let tag of this.requiredTags) {
            let newGraphs = []
            for (let graph of graphs) {
                if (store.getQuads(graph, namedNode(LocalOntology.hasTag), namedNode(tag), null).length > 0) {
                    newGraphs.push(graph)
                }
            }
            graphs = newGraphs;
        }

        const newStore = new Store()
        for (let graphTerm of graphs) {
            newStore.addQuads(store.getQuads(null, null, null, graphTerm))
        }
        return newStore
    }
}

export class Evaluator {
    
    session: Session | undefined;
    token: string;
    
    constructor(token: string) {
        this.token = token;
    }    

    startSession() {
        if (this.session !== undefined) throw new Error('Commit the previous session before opening a new one.')
        this.session = new Session()
        return this;
    }

    async commit() {
        if (this.session === undefined) throw new Error('Cannot commit empty session.')
        return await this.session.commitToStore()
    }

    loadRDF(quads: Quad[]) : Evaluator {
        if (this.session === undefined){
            this.startSession();
            return this.loadRDF(quads)
        }
        this.session?.addAsyncTask(async (store: Store) => {
            store.addQuads(quads);
            return store;
        })
        return this;
    }

    evaluateSignatures(options:{ trustedIssuers: string[] }) {
        if (this.session === undefined){
            throw new Error('Cannot evaluate signatures. Initialize a session and add data to be evaluated first!')
        }
        this.session.addAsyncTask(async (store: Store) => {
            this.session?.addTag(LocalOntology.SignatureValidated)

            const verificationResults = await verifyAllSignatures(store);
            for (let result of verificationResults) {
                if (!result.result) {
                    console.error(`Failed to verify signature of ${result.target.value}`)
                    continue;
                }
                // This is for when we will use reasoning
                // const triples = generateVerificationTriplesFromVerificationResult(result, this.token);
                if (options.trustedIssuers 
                    && options.trustedIssuers.length 
                    &&!options.trustedIssuers.includes(result.issuer.value)){
                    console.error(`Failed to verify signature, issuer ${result.issuer.value} is untrusted for the signature of ${result.target}`)
                }
                const target = result.target
                const type = await checkContainmentType(store, target)

                let graphs: Quad_Object[] = []

                if (type === ContainmentType.Dataset) {
                    graphs = store.getQuads(target, PackOntology.contains, null, null).map(q => q.object)
                } else if (type === ContainmentType.Graph) {
                    graphs = [target]
                } else { // target is a single URI (e.g. trusted image)
                    store.addQuad(target as Quad_Subject, namedNode(VerificationOntology.status), literal("true", XSD.boolean))
                    store.addQuad(target as Quad_Subject, namedNode(VerificationOntology.issuer), result.issuer)
                    store.addQuad(target as Quad_Subject, namedNode(VerificationOntology.trustedToken), literal(this.token))
                    store.addQuad(target as Quad_Subject, namedNode(LocalOntology.hasTag), namedNode(LocalOntology.SignatureValidated))
                }

                for(let graph of graphs) {
                    store.addQuad(graph as Quad_Subject, namedNode(VerificationOntology.status), literal("true", XSD.boolean))
                    store.addQuad(graph as Quad_Subject, namedNode(VerificationOntology.issuer), result.issuer)
                    store.addQuad(graph as Quad_Subject, namedNode(VerificationOntology.trustedToken), literal(this.token))
                    store.addQuad(graph as Quad_Subject, namedNode(LocalOntology.hasTag), namedNode(LocalOntology.SignatureValidated))
                }
                // Add triple indicating trust link for loose URLs
                console.log(`Verified signature of ${target.value}`)
            }
            return store;
        })
        return this;
    }


    evaluatePolicies(options?:{ requireTrusted?: true }) {
        if (this.session === undefined){
            throw new Error('Cannot evaluate signatures. Initialize a session and add data to be evaluated first!')
        }
        this.session.addTag(LocalOntology.PolicyValidated)

        this.session.addAsyncTask(async (store: Store) => {
            
            return store;
        })
        return this;
    }


    evaluateProvenance(options?:{ requireTrusted?: boolean, retrievedFrom?: string[], retrievedBy?: string[], retrievedAfter?: Date }) {
        // todo:: checking on conflicting provenance information or multiple sources for the same graph
        if (this.session === undefined){
            throw new Error('Cannot evaluate signatures. Initialize a session and add data to be evaluated first!')
        }
        this.session.addTag(LocalOntology.ProvenanceValidated)

        const requirePredicates: string[] = []
        if (options?.retrievedBy) requirePredicates.push(PackOntology.issuer)
        if (options?.retrievedFrom) requirePredicates.push(PackOntology.origin)
        if (options?.retrievedAfter) requirePredicates.push(PackOntology.timestamp)

        this.session.addAsyncTask(async (store: Store) => {
            // console.log('before', await serializeTrigFromStore(store))
            let graphs: Quad_Graph[] = []
            if (options?.requireTrusted) {
                // list includes messes up with RDF namednodes and blanknodes? equal checking on value instead
                const trustedURIs = store.getSubjects(namedNode(LocalOntology.hasTag), namedNode(LocalOntology.SignatureValidated), null).map(t => t.value)
                graphs = store.getGraphs(null, null, null).filter(g => trustedURIs.includes(g.value))
            } else {
                graphs = store.getGraphs(null, null, null)
            }

            // Iterate graphs untill all predicates are checked
            for (let predicate of requirePredicates) {
                let newGraphs: Quad_Graph[] = []
                for (let graph of graphs) {

                    let matches: Quad_Object[] = []

                    // match dataset
                    const datasetsContainingGraph = store.getQuads(null, namedNode(PackOntology.contains), graph, null).map(q => q.subject)
                    
                    // todo: check if dataset here stays within verification bounds if dataset is not in trusted graph itself?
                    for (let dataset of datasetsContainingGraph) {
                        matches = matches.concat(
                            store.getQuads(dataset, namedNode(predicate), null, null).map(q => q.object)
                        )
                    }

                    // match graph
                    matches = matches.concat(
                        store.getQuads(graph, namedNode(predicate), null, null)
                            .map(q => q.object)
                    )
                    
                    const object = matches[0]?.value

                    if (predicate === PackOntology.issuer) {
                        if (object && options?.retrievedBy?.includes(object)) {
                            newGraphs.push(graph)
                        }
                    } else if (predicate === PackOntology.origin) {
                        if (object && options?.retrievedBy?.includes(object)) {
                            newGraphs.push(graph)
                        }
                    } else if (options?.retrievedAfter && predicate === PackOntology.timestamp) {
                        if (object && new Date(object) < new Date(options.retrievedAfter)) {
                            newGraphs.push(graph)
                        }
                    }
                    console.log(graph, predicate, graphs, newGraphs)
                }
                graphs = newGraphs
            }
            for (let graph of graphs) {
                store.addQuad(graph as Quad_Subject, namedNode(LocalOntology.hasTag), namedNode(LocalOntology.ProvenanceValidated))
            }
            return store;
        })
        return this;
    }
}






/** 
 

Get all triples t for which they are signed by an issuer in issuerList and can be used for the purposes p1 and p2:

{ true } => { local:ExternalVerifierTrustedToken log:equalTo "EXTERNAL_VERIFIED" }  
{ true } => { local:SignatureVerificationToken log:equalTo "SIGNATURE_VERIFIED" }
{ true } => { local:PolicyVerificationToken log:equalTo "POLICY_VERIFIED" }
{ true } => { local:ConstraintVerificationToken log:equalTo "POLICY_VERIFIED" }
{ true } => { local:TrustedIssuers log:equalTo [<http://pod.rubendedecker.be/profile/card#me>] }


# First, we need to LIFT the policies from their graphs based on certain requirements (if there is a signature, it needs to be lifted from that)
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 










?graph log:includes ?t

// propagate signatures on datasets to individual graphs
{
    ?verificationResult verify:verifies ?dataset
    ?dataset pack:contains ?graph
} => {
    ?verificationResult verify:verifies ?graph
}


// check signature verification output
{
    ?graph local:hasToken local:SignatureVerificationToken
} <= {
    ?verificationResult verify:token ?token
    ?token log:equalTo local:ExternalVerifierTrustedToken
    ?verificationResult verify:verifies ?graph
    ?verificationResult verify:status true
    ?verificationResult verify:issuer ?issuer
    local:trustedIssuers list:member ?issuer
}

// check policy
{ 
    ?policyOrPermission odrl:target ?dataset
    ?dataset pack:contains ?graph
} => { 
    ?policyOrPermission odrl:target ?graph 
}


// check policy requirements
{
    ?perm a odrl:Permission
} <= {
    ?policy odrl:permission ?perm
}

{
    ?constr a odrl:Constraint
} <= {
    ?perm a odrl:Permission
    ?perm odrl:constraint ?constr
}

{ 
    ?constr local:hasToken local:ConstraintVerificationToken
} <= {
    ?constr
}

// check policy requirements
{
    ?graph local:hasToken local:PolicyVerificationToken
} <= {
    ?constraint odrl: 
    ?policy odrl:issuer ?issuer
    local:trustedIssuers list:member ?issuer
    ?policy odrl:permission ?perm
    ?perm odrl:target ?graph
    ?perm odrl:constraint ?graph
}


// check policy requirements
{
    ?graph local:hasToken local:PolicyVerificationToken
} <= {
    ?policy a odrl:Agreement
    ?policy odrl:issuer ?issuer
    local:trustedIssuers list:member ?issuer
    ?policy odrl:permission ?perm
    ?perm odrl:target ?graph
    ?perm odrl:constraint ?graph
}


// check policy for graph
{
}
data in Graph

*?
*/
