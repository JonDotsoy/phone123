import { isObject, isArray } from "util"
import { Spacing } from "./Spacing"

class ObjectToDTS {
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

    propValueToBuffer = (prop: string, val: any): Buffer => {
        if (isArray(val)) {
            if (val.every((e) => !isArray(e) && !isObject(e))) {
                return Buffer.concat([
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

    static transform = (obj: any) => new ObjectToDTS().objectToBuffer(obj)
}

export const objectToDTS = (obj: any) => ObjectToDTS.transform(obj)
