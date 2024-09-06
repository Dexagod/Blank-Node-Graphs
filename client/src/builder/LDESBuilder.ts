import { Quad, Quad_Graph, Quad_Object, Store, BlankNode, Term, NamedNode, Quad_Subject } from "n3";
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
import { createLogger } from "winston";
import { getResourceAsStore } from "@dexagod/rdf-retrieval";

import { DataFactory } from "../../../software/src";
import { log } from "../";
import { RDF } from "@inrupt/vocab-common-rdf";
import { PublicSignatureOptions } from "./Builder";
const { namedNode, blankNode, literal, quad, triple } = DataFactory

const DPV = "https://w3id.org/dpv#";

const LDESNAMESPACE = "https://w3id.org/ldes#"
const LDESOntology = {
    NAMESPACE: LDESNAMESPACE,
    EventStream: LDESNAMESPACE+"EventStream",
}

const TREENAMESPACE = "https://w3id.org/tree#"          
const TREEOntology = {
    NAMESPACE: TREENAMESPACE,
    view: TREENAMESPACE+"view",
    Node: TREENAMESPACE+"Node",
    relation: TREENAMESPACE+"relation",
    Relation: TREENAMESPACE+"Relation",
    member: TREENAMESPACE+"member",
    path: TREENAMESPACE+"path",

}


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

export class LDESBuilder {
    
    private LDEScounter = 0
    private session: undefined | Session;
    private signatureOptions: SignatureOptions;
    private baseURI: string;
    private pagePrefix: string;
    private LDESTerm: NamedNode;
    private previousView?: NamedNode;
    private members: Promise<FocusRDFStore>[];
    
    constructor(baseURI: string, pagePrefix: string, signatureOptions: PublicSignatureOptions) {
        this.signatureOptions = {
            privateKey: signatureOptions.privateKey,
            issuer: namedNode(signatureOptions.issuer),
            verificationMethod: signatureOptions.verificationMethod,
        }
        this.baseURI = baseURI;
        this.pagePrefix = pagePrefix;
        this.LDESTerm = namedNode(baseURI+"#LDES")
        this.session = undefined;
        this.members = [];
    }

    buildMember(store?: Store) {
        if (this.session !== undefined) throw new Error('Commit the previous session before opening a new one.')
        this.session = new Session(store)
        return this
    }

    async commit() {
        if (this.session === undefined) throw new Error('Cannot commit empty session.')
        return (await this.session.commitToStore()).getStore()
    }

    /**
     * 
     * @param quads 
     * @param contentDataset Wrap all member contents in a dataset that is focused for later added metadata. If this is false, signatures and policies will be added to the original defaultGraph!
     * @returns 
     */
    setMemberContents(quads: Quad[], contentDataset?: boolean): LDESBuilder {
        if (!this.session) { 
            log({ level: "warn", message: 'No session found, starting new session!' })
            this.buildMember()
            return this.setMemberContents(quads)
        }
        const loadRDFResourceTask = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            let resStore = new Store(quads)
            let renamedStore = renameAllGraphsInStore(resStore)
            if (contentDataset) {
                const datasetStore = createDatasetFromGraphsInStore(renamedStore.store, renamedStore.store.getGraphs(null, null, null), blankNode())
                store.addQuads( datasetStore.store.getQuads(null, null, null, null), datasetStore.id  )
                return store;
            } else {
                // Focus old default graph if existed, or pick a random one if not.
                const focusGraph = renamedStore.defaultGraph || renamedStore.store.getGraphs(null, null, null)[0]
                store.addQuads( renamedStore.store.getQuads(null, null, null, null), focusGraph )
                return store;

            }
            
        }
        this.session.addAsyncTask(loadRDFResourceTask)
        return this
    }

    setMemberPolicy(options: {duration?: string, purpose?: string[], assigner?: string, assignee?: string}): LDESBuilder {
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

    setMemberProvenance(options?: { origin?: string }): LDESBuilder {
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

    setMemberSignature(signatureOptions?: PublicSignatureOptions): LDESBuilder {
        if (!this.session) { log({ level: "warn", message: 'No session found, nothing to sign!' }); return this; }

        let chosenSignatureOptions: SignatureOptions = this.signatureOptions
        if (signatureOptions) {
            chosenSignatureOptions = {
                issuer: namedNode(signatureOptions.issuer),
                privateKey: signatureOptions.privateKey,
                verificationMethod: signatureOptions.verificationMethod
            }
        }

        const signRDFContents = async (store: FocusRDFStore): Promise<FocusRDFStore> => {
            const focus = store.getFocus();
            if (!focus) { log({ level: "warn", message: 'Cannot create signature of undefined focus node!'}); return store; }
            const containmentType = checkContainmentType(store.getStore(), focus)
            if (containmentType === ContainmentType.Dataset) {
                const quads = await tryCreateDatasetSignature(store.getStore(), focus as Quad_Object, chosenSignatureOptions)
                if (quads) { store.addQuads(quads) }
                else { log({ level: "warn", message: `Signature creation failed for ${focus}.`}); return store; }
            }
            else if (containmentType === ContainmentType.Graph) {
                const quads = await tryCreateGraphSignature(store.getStore(), focus as Quad_Graph, chosenSignatureOptions)
                if (quads) { store.addQuads(quads) }
                else { log({ level: "warn", message: `Signature creation failed for ${focus}.`}); return store; }
            }
            else { log({ level: "warn", message: `Cannot create signature of ${focus}. Target is neither a dataset nor a graph!`}); return store; }
            return store
        }
        this.session.addAsyncTask(signRDFContents)
        return this
    }

    commitMember(): LDESBuilder {
        if(!this.session) throw new Error('Committing non-existing member')
        this.members.push(this.session.commitToStore())
        
        // flush member session
        this.session = undefined
        
        return this
    }

    async commitPage(options?: {createSignatures?: boolean}) {
        const memberStores: Store[] = (await Promise.all(this.members)).map(focusStore => focusStore.getStore())
        const {view, store, url}  = await this.buildLDESPage(memberStores, this.previousView, options && options.createSignatures)
        this.previousView = view;
        
        // flush members list
        this.members = [];
        
        return { trig: await serializeTrigFromStore(store), url: url }
    }





    async buildLDESPage(members: Store[], previousView?: Quad_Object, createSignatures?: boolean): Promise<{ view: NamedNode, store: Store, url: string}> {
        const pageURL = `${this.baseURI}${this.pagePrefix}${this.LDEScounter}.trig`;
        const view = namedNode(`${pageURL}#view`);
        this.LDEScounter += 1;

        const pageStore = new Store()
        
        // set metadata
        pageStore.addQuads([
            quad(this.LDESTerm, namedNode(RDF.type), namedNode(LDESOntology.EventStream)),
            quad(this.LDESTerm, namedNode(TREEOntology.view), view),
            quad(view, namedNode(RDF.type), namedNode(TREEOntology.Node)),
        ])
        if(previousView) { 
            const relationBN = blankNode()
            pageStore.addQuads([
                quad(view, namedNode(TREEOntology.relation), relationBN),
                quad(relationBN, namedNode(RDF.type), namedNode(TREEOntology.Relation)),
                quad(relationBN, namedNode(TREEOntology.path), previousView),
            ])
        }

        for (let memberStore of members) {
            const renamedMemberStore = (await renameAllGraphsInStore(memberStore)).store
            // Create a dataset of all the graphs in the member (we rename the default graph!)
            const createdDataset = createDatasetFromGraphsInStore(
                renamedMemberStore,
                renamedMemberStore.getGraphs(null, null, null),
            )
            const updatedStore = createdDataset.store
            const datasetId = createdDataset.id

            if (createSignatures) {
                // Add LDES maintainer signature
                const signatureInfo = await createRDFDatasetSignature(updatedStore, datasetId, this.signatureOptions)
                const signatureTriples = createSignatureTriples(signatureInfo).triples
                updatedStore.addQuads(signatureTriples)
            }

            // Add the new member + the member signature by the maintainer
            pageStore.addQuads(updatedStore.getQuads(null, null, null, null))
            
            // Add a tree:member 
            pageStore.addQuad(this.LDESTerm, namedNode(TREEOntology.member), datasetId)
        }

        return { store: pageStore, view, url: pageURL }

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
