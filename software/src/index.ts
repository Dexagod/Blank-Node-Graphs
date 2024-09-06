export * from "./example/policy"

export * from "./package/package"
export * from "./package/unpackage"

export * from "./policy/policy"
export * from "./policy/validate"

export * from "./provenance/provenance"

export * from "./signature/sign"
export * from "./signature/verify"

export * from "./util/util"
export * from "./util/signUtils"
export * from "./util/trigUtils"
import { DataFactory } from "n3"
export { DataFactory } 


import { createLogger, LogEntry } from "winston"
import { Console } from "winston/lib/winston/transports"
const logLevel = process.env.LOG_LEVEL
const logger = createLogger({ level: logLevel || 'warn', transports: [ new (Console)() ]})

export function log(entry: LogEntry) { logger.log(entry) }

