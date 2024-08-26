import { Parser, Quad, Store, Writer } from 'n3'
import type * as rdf from 'rdf-js'

export type TrigString = string
export type TrigPackage = rdf.Quad[]
export type TrigPackageString = TrigString

export async function serializeTrigFromStore (store: Store): Promise<string> {
    return await new Promise((resolve, reject) => {
        const writer = new Writer({ format: 'application/trig' })
        writer.addQuads(store.getQuads(null, null, null, null))
        writer.end((error, result) => {
            if (error || !result) {
                throw new Error('Could not serialize package string correctly')
            }
            resolve(indentTrigString(result as string))
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
