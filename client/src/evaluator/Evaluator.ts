import { Quad, Store, Quad_Subject, Quad_Object } from "n3";
import { checkContainmentType, ContainmentType, generateVerificationTriplesFromVerificationResult, PackOntology, VerificationOntology, verifyAllSignatures } from "../../../software/src/"
import { XSD } from "@inrupt/vocab-common-rdf";

import { DataFactory } from "../../../software/src";
const { namedNode, blankNode, literal, quad } = DataFactory


class Session {

    private taskList: ((store: Store) => Promise<Store>)[]

    constructor() {
        this.taskList = []
    }

    addAsyncTask(task: (store: Store) => Promise<Store>) {
        this.taskList.push(task)
    }

    async commitToStore(store?: Store) {
        store = store || new Store()
        for (let task of this.taskList) {
            store = await task(store)
        }

        return store
    }
}

export class Evaluator {
    
    session: Session| undefined;
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
            const trustedStore = new Store();

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
                }
                for(let graph of graphs) {
                    // Add graph to results
                    trustedStore.addQuads(store.getQuads(null, null, null, graph))
                }
                // Add triple indicating trust link for loose URLs
                trustedStore.addQuad(target as Quad_Subject, namedNode(VerificationOntology.status), literal("true", XSD.boolean))
                trustedStore.addQuad(target as Quad_Subject, namedNode(VerificationOntology.issuer), result.issuer)
                console.log(`Verified signature of ${target.value}`)
            }
            return trustedStore;
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
