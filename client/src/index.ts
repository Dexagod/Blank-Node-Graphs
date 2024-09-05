import { createLogger, LogEntry } from "winston"
import { Console } from "winston/lib/winston/transports"

const logLevel = process.env.LOG_LEVEL
const logger = createLogger({ level: logLevel || 'warn', transports: [ new (Console)() ]})

export function log(entry: LogEntry) { logger.log(entry) }

