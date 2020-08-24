import { isObject, isArray } from "util"
import { Spacing } from "./Spacing"

class ObjectToJS {
    spacing = new Spacing()

    private constructor() {}

    println = (body: string | Buffer) =>
        Buffer.from(`${this.spacing.toString()}${body}\n`)
    print = (body: string) => Buffer.from(`${this.spacing.toString()}${body}`)
    printStart = (body: string) => Buffer.from(`${body}\n`)

    valueToBuffer = (val: any) =>
        isObject(val)
            ? this.objectToBuffer(val)
            : Buffer.from(JSON.stringify(val))

    propValueToBuffer = (prop: string, val: any) => {
        if (isArray(val)) {
            if (val.every((e) => !isArray(e) && !isObject(e))) {
                return Buffer.concat([
                    this.println(
                        `/** @type {[${val
                            .map((val) => JSON.stringify(val))
                            .join(" | ")}]} */`
                    ),
                    this.println(
                        `${JSON.stringify(prop)}: ${this.valueToBuffer(val)},`
                    ),
                ])
            }
        }
        if (isObject(val)) {
            return this.println(
                `${JSON.stringify(prop)}: ${this.valueToBuffer(val)},`
            )
        }

        return Buffer.concat([
            this.println(`/** @type {${JSON.stringify(val)}} */`),
            this.println(
                `${JSON.stringify(prop)}: ${this.valueToBuffer(val)},`
            ),
        ])
    }

    objectToBuffer = (obj: any): Buffer => {
        if (isArray(obj)) {
            if (obj.length === 0) return Buffer.from("[]")
            const bfs: Buffer[] = []
            bfs.push(this.printStart("["))
            this.spacing.up()

            const propsBfs: Buffer[] = []

            for (const val of obj) {
                propsBfs.push(this.println(`${this.valueToBuffer(val)},`))
            }

            bfs.push(...propsBfs)
            this.spacing.down()
            bfs.push(this.print("]"))

            return Buffer.concat(bfs)
        }
        if (isObject(obj)) {
            const bfs: Buffer[] = []

            bfs.push(this.printStart("{"))
            this.spacing.up()

            const propsBfs: Buffer[] = []

            for (const [prop, val] of Object.entries(obj)) {
                propsBfs.push(this.propValueToBuffer(prop, val))
            }

            bfs.push(...propsBfs)
            this.spacing.down()
            bfs.push(this.print("}"))

            return Buffer.concat(bfs)
        }
        return this.println("null")
    }

    static transform = (obj: any) => new ObjectToJS().objectToBuffer(obj)
}

export const objectToJS = (obj: any) => ObjectToJS.transform(obj)
