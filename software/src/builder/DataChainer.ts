import { Store } from "n3";

export class Builder {
    
    private store: Store;

    constructor() {
        this.store = new Store();
    }

    addQuadArray() {}

    addStore() {}

    addRemoteRDFdocument() {}

    addRemoteRDFSignature() {}

    addRemoteResourceSignature() {}


}

/**
 * 
 * How does the builder work?
 * 
 * We want to achieve a sequence system
 * 
 * builder
 *  .startSession()             -> startKeepingTrack
 *  .addRDFResource(X)          -> internal tag resourceGraph
 *  .addPolicy(Pol)             -> internal tag policyGraph
 *  .addExternalResourceSignature(img) -> internal tag signatureGraph
 *  .bundleGraphsAsDataset()    -=> returns dataset  ->> bundle all graphs created in this session
 *  .sign()                     -> focus last created resource graph or dataset
 *  .commitSession();
 * 
 * 
 * 
 * 
 * builder.focusDataset(datasetURI)
 * builder.focusGraph(graphURI)
 * builder.focusMatch({subj, pred, obj, graph}, matchposition (e.g. "graph"))
 * 
 * 
 * 
 * 
 * standardized resource format:
 * 
 * _:orig_content_dataset a pack:Dataset;
 *      pack:contains _:g1, _:g2.
 * 
 * _:orig_g1 { contentGrapg1 }
 * _:orig_g2 { contentGrapg2 }
 * 
 * _:orig_s1 { 
 *      _:s a sign:IntegrityProof ;
 *          sign:target _:orig_content_dataset.
 * }
 * 
 * 
 * 
 * 
 * 
 * _:
 *  
 * 
 * 
 */
