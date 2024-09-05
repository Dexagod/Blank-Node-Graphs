import { Quad, Quad_Graph, Quad_Object, Store, BlankNode, Term, NamedNode } from "n3";
import {
    checkContainmentType, 
    ContainmentType, 
    createDatasetFromGraphsInStore, 
    createDatasetQuads, 
    createProvenanceTriples, 
    createRDFDatasetSignature, 
    createRDFGraphSignature, 
    createRemoteRDFSignature, 
    createRemoteResourceSignature, 
    createSignatureTriples, 
    createSimplePolicy, 
    renameAllGraphsInStore, 
    renameGraph, 
    serializeTrigFromStore, 
    SignatureInfo, 
    SignatureOptions
} from "../../../software/src/"
import { log } from "winston";
import { getResourceAsStore } from "@dexagod/rdf-retrieval";

import { DataFactory } from "../../../software/src";
const { namedNode, blankNode, literal, quad, triple } = DataFactory

const DPV = "https://w3id.org/dpv#";

class FocusRDFStore {

    private store: Store;
    private focusNode: Term | undefined;
    private addedGraphs: Term[];

    constructor(store?: Store) {
        this.store = store || new Store();
        this.focusNode = undefined;
        this.addedGraphs = [];
    }

    addQuads(quads: Quad[], newFocusNode?: Term) {
        const graphs = [... new Set(quads.map(q => q.graph))]
        this.addedGraphs = this.addedGraphs.concat(graphs)
        if (newFocusNode) this.focusNode = newFocusNode
        this.store.addQuads(quads)
    }

    getFocus() { return this.focusNode }
    setFocus(term: Term) { this.focusNode = term }
    
    getStore() { return this.store }
    
    getAddedGraphs() { return [ ...new Set(this.addedGraphs)] }

    scopeOutDatasetFocus(datasetId: Term, graph?: Quad_Graph) {
        this.focusNode = datasetId;
        this.addedGraphs = graph ? [ graph ] : []
    }
}

class Session {

    // store: Store  
    private taskList: ((store: FocusRDFStore) => Promise<FocusRDFStore>)[]
    private focusNode: Term | undefined;
    private store: Store | undefined

    constructor(store?: Store) {
        // this.store = new Store()[]
        this.taskList = []
        this.focusNode = undefined;
        this.store = store
    }

    addAsyncTask(task: (store: FocusRDFStore) => Promise<FocusRDFStore>) {
        this.taskList.push(task)
    }

    async commitToStore() {
        let store = new FocusRDFStore(this.store);
        for (let task of this.taskList) {
            store = await task(store)
        }

        return store
    }
}

export type PublicSignatureOptions = {
    privateKey: CryptoKey, 
    issuer: string, 
    verificationMethod: string,
}

export class Builder {
    
    private session: undefined | Session;
    private signatureOptions: SignatureOptions;
    
    constructor(signatureOptions: PublicSignatureOptions) {
        this.signatureOptions = {
            privateKey: signatureOptions.privateKey,
            issuer: namedNode(signatureOptions.issuer),
            verificationMethod: signatureOptions.verificationMethod,
        }
        this.session = undefined;
    }

    startSession(store?: Store) {
        if (this.session !== undefined) throw new Error('Commit the previous session before opening a new one.')
        this.session = new Session(store)
        return this
    }

    async commit() {
        if (this.session === undefined) throw new Error('Cannot commit empty session.')
        return (await this.session.commitToStore()).getStore()
    }

    loadRDF(url: string): Builder {
        if (!this.session) { 
            log({ level: "warn", message: 'No session found, starting new session!' })
            this.startSession()
            return this.loadRDF(url)
        }
        const loadRDFResourceTask = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            if (! await isRDFResource(url)) throw new Error('Cannot load non-rdf resources as RDf.')
            let resStore = await getResourceAsStore(url) as Store;
            let r = renameAllGraphsInStore(resStore)
            // r.defaultGraph = the new renamed default graph blank node identifier
            store.addQuads( r.store.getQuads(null, null, null, null), r.defaultGraph  )
            return store;
        }
        this.session.addAsyncTask(loadRDFResourceTask)
        return this
    }

    sign(): Builder {
        if (!this.session) { log({ level: "warn", message: 'No session found, nothing to sign!' }); return this; }

        const signRDFContents = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            const focus = store.getFocus();
            if (!focus) { log({ level: "warn", message: 'Cannot create signature of undefined focus node!'}); return store; }
            const containmentType = checkContainmentType(store.getStore(), focus)
            if (containmentType === ContainmentType.Dataset) {
                const quads = await tryCreateDatasetSignature(store.getStore(), focus as Quad_Object, this.signatureOptions)
                if (quads) { store.addQuads(quads) }
                else { log({ level: "warn", message: `Signature creation failed for ${focus}.`}); return store; }
            }
            else if (containmentType === ContainmentType.Graph) {
                const quads = await tryCreateGraphSignature(store.getStore(), focus as Quad_Graph, this.signatureOptions)
                if (quads) { store.addQuads(quads) }
                else { log({ level: "warn", message: `Signature creation failed for ${focus}.`}); return store; }
            }
            else { log({ level: "warn", message: `Cannot create signature of ${focus}. Target is neither a dataset nor a graph!`}); return store; }
            return store
        }
        this.session.addAsyncTask(signRDFContents)
        return this
    }

    signPredicates(predicates: string[], canonicalize = false): Builder {
        if (!this.session) { log({ level: "warn", message: 'No session found, nothing to sign!'}); return this; }

        const signRDFPredicates = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            const signatureWaitList: Promise<Quad[] | undefined>[] = []
            for (let quad of store.getStore().getQuads(null, null, null, null)) {
                if (predicates.includes(quad.predicate.value)) {
                    const targetResource = getTargetResourceURI(quad.object.value)
                    if (canonicalize && await isRDFResource(targetResource)) {
                        const quads = tryCreateRemoteRDFResourceSignature(targetResource, this.signatureOptions)
                        signatureWaitList.push(quads)
                    } else {
                        const quads = tryCreateRemoteResourceSignature(targetResource, this.signatureOptions)
                        signatureWaitList.push(quads)
                    }   
                }
            }
            const awaitedSignatureQuads = await Promise.all(signatureWaitList)
            for (let signatureQuads of awaitedSignatureQuads) {
                if(!signatureQuads) continue;
                store.addQuads(signatureQuads)
            }
            return store
        }
        this.session.addAsyncTask(signRDFPredicates)
        return this
    }

    signExternal(url: string, canonicalize = false): Builder {
        if (!this.session) { 
            log({ level: "warn", message: 'No session found, starting new session!'})
            this.startSession()
            return this.loadRDF(url)
        }

        const signRDFExternal = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            if (canonicalize && await isRDFResource(url)) {
                const quads = await tryCreateRemoteRDFResourceSignature(url, this.signatureOptions)
                if(quads) store.addQuads(quads)
            } else {
                const quads = await tryCreateRemoteResourceSignature(url, this.signatureOptions)
                if(quads) store.addQuads(quads)
            }   
            return store
        }
        this.session.addAsyncTask(signRDFExternal)
        return this
    }

    policy(options: {duration?: string, purpose?: string[], assigner?: string, assignee?: string}) {
        let {duration, purpose, assigner, assignee} = options
        if (!duration) duration = "P7D"

        if (!this.session) { log({ level: "warn", message: 'No session found, nothing to set policy over!'}); return this; }

        const createPolicy = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            const focus = store.getFocus();
            if (!focus) { log({ level: "warn", message: 'Cannot create signature of undefined focus node!'}); return store; }
            const pol = createSimplePolicy({
                target: focus as Quad_Object, 
                duration: duration, 
                purpose: purpose || undefined,
                assigner,
                assignee
            })
            const graph =  blankNode()
            const quads = pol.triples.map(t => quad(t.subject, t.predicate, t.object, graph))
            store.addQuads(quads)
            return store
        }
        this.session.addAsyncTask(createPolicy)
        return this        
    }

    provenance(options?: { origin?: string }) {
        if (!this.session) { log({ level: "warn", message: 'No session found, nothing to add provenance over!'}); return this; }
        
        const origin = options && options.origin

        const addProvenance = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            const focus = store.getFocus();
            if (!focus) { log({ level: "warn", message: 'Cannot create signature of undefined focus node!'}); return store; }
            const issuer = this.signatureOptions.issuer as NamedNode;
            const provenance = await createProvenanceTriples({
                origin: origin ? namedNode(origin) : undefined,
                issuer,
                target: focus as NamedNode | BlankNode
            })
            const graph = blankNode()
            const quads = provenance.triples.map(t => quad(t.subject, t.predicate, t.object, graph))
            store.addQuads(quads)
            return store
        }
        this.session.addAsyncTask(addProvenance)
        return this        
    }

    dataset() {
        if (!this.session) { log({ level: "warn", message: 'No session found, cannot generate dataset!'}); return this; }

        const createDataset = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            const dataset = createDatasetQuads(store.getStore(), store.getAddedGraphs() as Quad_Graph[])
            const graph =  blankNode()
            const quads = dataset.quads.map(t => quad(t.subject, t.predicate, t.object, graph))
            store.addQuads(quads)
            store.scopeOutDatasetFocus(dataset.id, graph)
            return store
        }
        this.session.addAsyncTask(createDataset)
        return this        
    }
}







const acceptedRDFContentTypes = [
	"application/trig",
	"application/n-quads",
	"text/turtle",
	"application/n-triples",
	"text/n3",
	"application/ld+json",
	"application/rdf+xml",
]

async function isRDFResource(url: string) {
	const head = await fetch(url, {method: "HEAD"})
    const contentTypeHeader = head.headers.get('Content-Type') || "text/turtle"
    const breakpoint = /;\s*charset=/
    const contentType = contentTypeHeader?.split(breakpoint)[0]
    const charset = contentTypeHeader?.split(breakpoint)[1]
	return !!contentType && acceptedRDFContentTypes.includes(contentType)
}

function getTargetResourceURI(target: string) {
    return target.split('#')[0].split('?')[0]
}

function promiseWithTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutError = new Error('Promise timed out')
  ): Promise<T> {
    // create a promise that rejects in milliseconds
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(timeoutError);
      }, ms);
    });
  
    // returns a race between timeout and the passed promise
    return Promise.race<T>([promise, timeout]);
}

async function tryCreateSignature(promise: Promise<SignatureInfo>, errorMessage: string, target?: string): Promise<Quad[] | undefined> {
    return new Promise<Quad[] | undefined>(async (resolve, reject) => {
        try {
            // todo:: this timeout makes it so that the whole system hangs when the signature is fulfilled
            const signatureInfo = await promiseWithTimeout(promise, 2000, new Error(errorMessage))
            const signatureTriples = createSignatureTriples(signatureInfo).triples
            const graph = blankNode();
            log({ level: "verbose", message: `creating signature graph with graph uri ${graph.value}`})
            resolve(signatureTriples.map(t => quad(t.subject, t.predicate, t.object, graph)))
        } catch (e) {
            log({ level: "error", message: (e as Error).message })
            resolve(undefined)
        }
    })
}

async function tryCreateDatasetSignature(store: Store, datasetId: Quad_Object, signatureOptions: SignatureOptions): Promise<Quad[] | undefined> {
    log({ level: "verbose", message: `Generating signature for local dataset: ${datasetId.value}` })
    return await tryCreateSignature(
        createRDFDatasetSignature(store, datasetId, signatureOptions),
        `Signature generation for dataset ${datasetId} timed out.`,
        datasetId.value
    )
}

async function tryCreateGraphSignature(store: Store, graphId: Quad_Graph, signatureOptions: SignatureOptions): Promise<Quad[] | undefined> {
    log({ level: "verbose", message: `Generating signature for local graph: ${graphId.value}`})
    return await tryCreateSignature(
        createRDFGraphSignature(store, graphId, signatureOptions),
        `Signature generation for dataset ${graphId} timed out.`,
        graphId.value
    )
}

async function tryCreateRemoteRDFResourceSignature(uri: string, signatureOptions: SignatureOptions): Promise<Quad[] | undefined> {
    log({ level: "verbose", message: `Generating signature for remote RDF resource: ${uri}`})
    return tryCreateSignature(
        createRemoteRDFSignature(uri, signatureOptions),
        `Signature generation for ${uri} timed out.`,
        uri
    )
}

async function tryCreateRemoteResourceSignature(targetResource: string, signatureOptions: SignatureOptions): Promise<Quad[] | undefined> {
    try {
        log({ level: "verbose", message: `Generating signature for remote resource: ${targetResource}` })
        return tryCreateSignature(
            createRemoteResourceSignature(targetResource, signatureOptions),
            `Signature generation for ${targetResource} timed out.`,
            targetResource
        )
    } catch (e) {
        log({ level: "error", message: (e as Error).message })
        return undefined
    }
}
