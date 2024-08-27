import moment, { Moment } from "moment"


const m = moment()
m.add("P1M")

console.log(m.toISOString())