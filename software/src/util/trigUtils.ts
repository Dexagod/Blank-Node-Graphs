import { Parser, Quad, Quad_Subject, Store, Writer, Quad_Object } from 'n3'
import type * as rdf from 'rdf-js'
import { DataFactory, unpackRDFList } from "../../src"
import { RDF } from '@inrupt/vocab-common-rdf'

export type TrigString = string
export type TrigPackage = rdf.Quad[]
export type TrigPackageString = TrigString

export async function serializeTrigFromStore (store: Store, beautifyList?: boolean): Promise<string> {
    
    const listStore = new Store()
    const listBases: Quad_Subject[] = []

    return await new Promise((resolve, reject) => {
        const writer = new Writer({ format: 'application/trig' })
        for (let quad of store.getQuads(null, null, null, null)) {
            if (beautifyList) {
                if(quad.predicate.equals(DataFactory.namedNode(RDF.first))) {
                    listStore.addQuad(quad)
                    listBases.push(quad.subject)
                } else if (quad.predicate.equals(DataFactory.namedNode(RDF.rest))) {
                    listStore.addQuad(quad)
                } else {
                    writer.addQuad(quad)
                }
            } else {
                writer.addQuad(quad)
            }            
        }
        writer.end((error, result) => {
            if (error) {
                throw new Error('Could not serialize package string correctly')
            } else if (!result) {
                resolve('')
            }
            let trigString = indentTrigString(result as string)
            if(beautifyList) {
                for (let base of listBases) {
                    const unpacked = unpackRDFList(listStore, base)
                    const regex = new RegExp((base.id || base.value)+"[^a-zA-Z0-9]")
                    trigString = trigString.replace(regex, serializeRDFList(unpacked))
                }
            }            
            resolve(trigString)
        })
    })
}

export function parseTrigToStore (content: string): Store {
    const store = new Store();
    store.addQuads(new Parser({ format: 'application/trig' }).parse(content))
    return store 
}

function indentTrigString (trigString: TrigString): TrigString {
    let result = ''
    const indent = '\t'
    let indented = false
    for (let line of trigString.split('\n')) {
        line = line.replace(/\s\s+/g, '\t')
        if (line.includes('{')) {
            indented = true
            result += line + '\n'
        } else if (line.includes('}')) {
            indented = false
            result += line + '\n'
        } else {
            result += indented ? indent + line + '\n' : line + '\n'
        }
    }
    return result.trimEnd()
}

function serializeRDFList(items: Quad_Object[]) {
    let str = "("
    for (let item of items) {
        str += " "+(item.id || item.value).toString()
    }
    str += ` )\n`;
    return str
}