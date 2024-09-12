import { Quad, Store, Quad_Subject, Quad_Object, Quad_Graph, Term, NamedNode, BlankNode } from "n3";
import { checkContainmentType, ContainmentType, generateVerificationTriplesFromVerificationResult, getContainingDatasets, getPackageContentIds, PackOntology, serializeTrigFromStore, VerificationOntology, verifyAllSignatures } from "../../../software/src/"
import { XSD, RDF, ODRL } from "@inrupt/vocab-common-rdf";
import { evaluateConstraintCompliance, PURPOSE } from "./PolicyEvaluator";

import { DataFactory } from "../../../software/src";
import { log } from "..";

const { namedNode, blankNode, literal, quad, defaultGraph } = DataFactory

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
        const finalStore = this.commit(store)
        return finalStore
    }

    async commitToString(store?: Store, flatten?: boolean): Promise<String> {
        const finalStore = await this.commit(store)
        if (flatten) {
            return await flattenTrig(finalStore)
        } else {
            const str = await serializeTrigFromStore(finalStore, true)
            return str;
        }
    }

    private async commit(store?: Store) {
        store = store || new Store()
        for (let task of this.taskList) {
            let newStore;
            try {
                newStore = await task(store)
            } catch (e) {
                log({level: "error", message: `Could not finalize task: ${(e as Error).message}`})
                newStore = store;
            }
            store = newStore
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
    
    constructor(token?: string) {
        this.token = token || "EVALUATOR_TRUST_TOKEN";
    }    

    startSession() {
        if (this.session !== undefined) throw new Error('Commit the previous session before opening a new one.')
        this.session = new Session()
        return this;
    }

    async commit() {
        if (this.session === undefined) throw new Error('Cannot commit empty session.')
        const store = await this.session.commitToStore()
        return store;
    }
    
    async commitToString(flatten?: boolean) {
        if (this.session === undefined) throw new Error('Cannot commit empty session.')
        return await this.session.commitToString(undefined, flatten);
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

            log({level: "verbose", message: `Evaluating Signatures`})

            this.session?.addTag(LocalOntology.SignatureValidated)

            const verificationResults = await verifyAllSignatures(store);
            for (let result of verificationResults) {
                if (!result.result) {
                    log({level: "warn", message: `Failed to verify signature of ${result.target.value}`})
                    continue;
                }
                // This is for when we will use reasoning
                // const triples = generateVerificationTriplesFromVerificationResult(result, this.token);
                if (options.trustedIssuers 
                    && options.trustedIssuers.length 
                    &&!options.trustedIssuers.includes(result.issuer.value)){
                        log({level: "warn", message: `Failed to verify signature, issuer ${result.issuer.value} is untrusted for the signature of ${result.target.value}`})
                        continue;
                }
                const target = result.target
                const type = await checkContainmentType(store, target)

                let graphs: Quad_Object[] = []

                if (type === ContainmentType.Dataset) {
                    graphs = getPackageContentIds(store, target)
                    // metadata for dataset
                    // store.addQuad(target as Quad_Subject, namedNode(VerificationOntology.status), literal("true", XSD.boolean))
                    // store.addQuad(target as Quad_Subject, namedNode(VerificationOntology.issuer), result.issuer)
                    // store.addQuad(target as Quad_Subject, namedNode(VerificationOntology.trustedToken), literal(this.token))
                    // store.addQuad(target as Quad_Subject, namedNode(LocalOntology.hasTag), namedNode(LocalOntology.SignatureValidated))
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
                log({level: "verbose", message: `Verified signature of ${target.value}`})
            }
            return store;
        })
        return this;
    }


    evaluatePolicies(options:{ requireTrusted?: true, purpose: string }) {
        if (this.session === undefined){
            throw new Error('Cannot evaluate signatures. Initialize a session and add data to be evaluated first!')
        }
        this.session.addTag(LocalOntology.PolicyValidated)

        // todo:: implement requireTrusted! and do it maybe in a better way for all processing?

        this.session.addAsyncTask(async (store: Store): Promise<Store> => {
            log({level: "verbose", message: `Evaluating Policies`})
            const complyingGraphs: Quad_Object[] = []
            
            let agreements = store.getQuads(null, namedNode(RDF.type), namedNode(ODRL.Agreement), null).map(q => q.subject)
            for (let agreement of agreements) {
                let permissions = store.getQuads(agreement, namedNode(ODRL.permission), null, null).map(q => q.object)
                for (let permission of permissions) {
                    const usePermission = store.getQuads(permission, namedNode(ODRL.action), namedNode(ODRL.use), null)
                    if (!usePermission) continue;

                    // Target for which permissions are calculated
                    const permissionTarget = store.getQuads(permission, namedNode(ODRL.target), null, null).map(q => q.object)[0]
                    const constraints = store.getQuads(permission, namedNode(ODRL.constraint), null, null).map(q => q.object)

                    let compliant = true
                    for (let constraint of constraints) {
                        const constraint_valid = evaluateConstraintCompliance(store, constraint as Quad_Subject, options.purpose)
                        if(!constraint_valid) compliant = false
                    }
                    if (compliant) { complyingGraphs.push(permissionTarget) }
                }
            }
            for (let term of complyingGraphs) {
                const containmentType = await checkContainmentType(store, term as Term)
                if (containmentType === ContainmentType.Dataset) {
                    // Also add the dataset
                    // store.addQuad(term as Quad_Subject, namedNode(LocalOntology.hasTag), namedNode(LocalOntology.PolicyValidated))
                    for (let graph of getPackageContentIds(store, term)) {
                        store.addQuad(graph as Quad_Subject, namedNode(LocalOntology.hasTag), namedNode(LocalOntology.PolicyValidated))
                    }
                } else {
                    store.addQuad(term as Quad_Subject, namedNode(LocalOntology.hasTag), namedNode(LocalOntology.PolicyValidated))
                }   
            }
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
            log({level: "verbose", message: `Evaluating Provenance`})
            let graphs: Quad_Graph[] = []
            if (options?.requireTrusted) {
                // list includes messes up with RDF namednodes and blanknodes? equal checking on value instead
                const trustedURIs = store.getSubjects(namedNode(LocalOntology.hasTag), namedNode(LocalOntology.SignatureValidated), null).map(t => t.value)
                graphs = store.getGraphs(null, null, null).filter(g => trustedURIs.includes(g.value))
            } else {
                graphs = store.getGraphs(null, null, null)
            }

            graphs = graphs.filter(g => !g.equals(defaultGraph()))

            // Iterate graphs untill all predicates are checked
            for (let predicate of requirePredicates) {
                let newGraphs: Quad_Graph[] = []
                for (let graph of graphs) {

                    let matches: Quad_Object[] = []

                    // todo: Need to fix sth in these equals checks cause that shit just does not work
                    // match dataset, 
                    const datasetsContainingGraph = graphs.map(g => getContainingDatasets(store, g as NamedNode | BlankNode)).flat().filter(onlyUnique)
                    function onlyUnique(value: any, index:any , array: any[]) {
                        return array.map(e => e.value).indexOf(value.value) === index;
                    }

                    // todo: check if dataset here stays within verification bounds if dataset is not in trusted graph itself?
                    for (let dataset of datasetsContainingGraph) {
                        matches = matches.concat(store.getObjects(dataset, namedNode(predicate), null))
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
                        if (object && options?.retrievedFrom?.includes(object)) {
                            newGraphs.push(graph)
                        }
                    } else if (options?.retrievedAfter && predicate === PackOntology.timestamp) {
                        if (object && new Date(object) > new Date(options.retrievedAfter)) {
                            newGraphs.push(graph)
                        }
                    }
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

async function flattenTrig(store: Store) { 
    const graphs = store.getGraphs(null, null, null)
    for (let graph of graphs) {
        const graphAsSubj = store.getQuads(graph, null, null, null)
        const graphAsObj = store.getQuads(null, null, graph, null)

        if (graphAsSubj.length === 0 && graphAsObj.length === 0) {
            const quads = store.getQuads(null, null, null, graph)
            store.removeQuads(quads)
            store.addQuads(quads.map(q => quad(q.subject, q.predicate, q.object, defaultGraph())))
        } else {
            // duplicate graph contents in default graph if there are links to the graph itself
            store.addQuads(
                store.getQuads(null, null, null, graph)
                    .map(q => quad(q.subject, q.predicate, q.object, defaultGraph())
                )
            )
        }
    }
    return await serializeTrigFromStore(store, true);
}