import fs from "fs"
import csvParse from "csv-parse/lib/sync"
import https from "https"
import { objectToJS } from "./ObjectToJS"
import { objectToDTS } from "./ObjectToDTS"

const SOURCE_PATH = `${__dirname}/../../../../src`
const LIB_COUNTRYCODES_PATH = `${__dirname}/../../../../lib/countrycodes`

// https://countrycode.org/customer/countryCode/downloadCountryCodes
// https://countrycode.org/customer/countryCode/downloadNationalCodes?country=AL
// https://countrycode.org/customer/countryCode/downloadCityCodes?country=AL

export interface NationalCode {
    PhoneCode: string
    Description: string
}

export interface CityCode {
    PhoneCode: string
    Description: string
}

export interface CountryCode {
    CountryName: string
    ISO2: string
    ISO3: string
    TopLevelDomain: string
    FIPS: string
    ISONumeric: number
    GeoNameID: number
    E164: number
    PhoneCode: string[]
    Continent: Continent
    Capital: string
    TimeZoneinCapital: string
    Currency: string
    LanguageCodes: string[]
    Languages: string
    AreaKM2: number
    InternetHosts: number
    InternetUsers: number
    "Phones (Mobile)": number
    "Phones (Landline)": number
    GDP: number
}

export enum Continent {
    Africa = "Africa",
    Antarctica = "Antarctica",
    Asia = "Asia",
    Europe = "Europe",
    NorthAmerica = "North America",
    Oceania = "Oceania",
    SouthAmerica = "South America",
}

export interface CountryCodeFull extends CountryCode {
    NationalCodes: NationalCode[]
    CityCodes: CityCode[]
}

const getCache = (cachePath?: string) =>
    cachePath
        ? {
              has: () => fs.existsSync(cachePath),
              get: () => fs.readFileSync(cachePath),
              put: (buffer: Buffer) => fs.writeFileSync(cachePath, buffer),
          }
        : undefined

const downloadBuffer = ({
    url,
    cachePath,
}: {
    url: string
    cachePath?: string
}) =>
    new Promise<Buffer>((resolve, reject) => {
        const c = getCache(cachePath)

        if (c?.has()) return resolve(c.get())

        console.log(`Download... ${url}`)

        const req = https.get(url, (res) => {
            const body: Buffer[] = []
            res.on("data", (d: Buffer) => {
                body.push(d)
            })

            res.on("end", () => {
                const buffer = Buffer.concat(body)
                c?.put(buffer)
                resolve(buffer)
            })

            res.on("error", (err) => {
                reject(err)
            })
        })

        req.end()
    })

const downloadCountryCodes = async (): Promise<CountryCode[]> => {
    const res = await downloadBuffer({
        url:
            "https://countrycode.org/customer/countryCode/downloadCountryCodes",
        cachePath: `${SOURCE_PATH}/countrycode.org/countrycodes.csv`,
    })

    return csvParse(res.toString("latin1"), {
        fromLine: 2,
        columns: [
            "CountryName",
            "ISO2",
            "ISO3",
            "TopLevelDomain",
            "FIPS",
            "ISONumeric",
            "GeoNameID",
            "E164",
            "PhoneCode",
            "Continent",
            "Capital",
            "TimeZoneinCapital",
            "Currency",
            "LanguageCodes",
            "Languages",
            "AreaKM2",
            "InternetHosts",
            "InternetUsers",
            "Phones (Mobile)",
            "Phones (Landline)",
            "GDP",
        ],
        cast: (value, context) => {
            switch (context.column) {
                case "LanguageCodes":
                case "PhoneCode":
                    return value.split(/\,\s*/)
                case "ISONumeric":
                case "GeoNameID":
                case "E164":
                case "AreaKM2":
                case "InternetHosts":
                case "InternetUsers":
                case "Phones (Mobile)":
                case "Phones (Landline)":
                case "GDP":
                    return value ? Number(value) : null
                default:
                    return value
            }
        },
    })
}

const downloadNationalCodes = async ({
    ISO2,
}: {
    ISO2: string
}): Promise<NationalCode[]> => {
    const res = await downloadBuffer({
        url: `https://countrycode.org/customer/countryCode/downloadNationalCodes?country=${ISO2}`,
        cachePath: `${SOURCE_PATH}/countrycode.org/nationalcodes-${ISO2}.csv`,
    })

    return csvParse(res.toString("latin1"), {
        fromLine: 2,
        columns: ["PhoneCode", "Description"],
    })
}

const downloadCityCodes = async ({
    ISO2,
}: {
    ISO2: string
}): Promise<CityCode[]> => {
    const res = await downloadBuffer({
        url: `https://countrycode.org/customer/countryCode/downloadCityCodes?country=${ISO2}`,
        cachePath: `${SOURCE_PATH}/countrycode.org/citycodes-${ISO2}.csv`,
    })

    return csvParse(res.toString("latin1"), {
        fromLine: 2,
        columns: ["PhoneCode", "Description"],
    })
}

const downloadCountryCodesFull = async (opt?: {
    cachePath?: string
}): Promise<Buffer> => {
    const c = getCache(opt?.cachePath)

    if (c?.has()) return c.get()

    const e: CountryCodeFull[] = []

    for (const countryCode of await downloadCountryCodes()) {
        const countrycodes = {
            ...countryCode,
            CityCodes: (
                await downloadCityCodes({ ISO2: countryCode.ISO2 })
            ).filter((e) => !!e.Description),
            NationalCodes: (
                await downloadNationalCodes({ ISO2: countryCode.ISO2 })
            ).filter((e) => !!e.Description),
        }
        e.push(countrycodes)
    }

    const res = Buffer.from(JSON.stringify(e))

    c?.put(res)

    return res
}

const writeLibItem = (opt: {
    fileName: string
    varName: string
    body: any
}) => {
    const fileName = opt.fileName
    const varName = opt.varName
    const body = opt.body

    fs.writeFileSync(
        `${LIB_COUNTRYCODES_PATH}/${fileName}.json`,
        JSON.stringify(body, null, 2)
    )
    fs.writeFileSync(
        `${LIB_COUNTRYCODES_PATH}/${fileName}.d.ts`,
        Buffer.concat([
            Buffer.from(`export declare const ${varName}: `),
            objectToDTS(body),
            Buffer.from(`;\n`),
        ])
    )
    fs.writeFileSync(
        `${LIB_COUNTRYCODES_PATH}/${fileName}.js`,
        Buffer.concat([
            Buffer.from(`const ${varName} = `),
            objectToJS(body),
            Buffer.from(`;\n`),
            Buffer.from(`\n`),
            Buffer.from(`exports.${varName} = ${varName};\n`),
        ])
    )
}

export const run = async () => {
    const bf = await downloadCountryCodesFull({
        cachePath: `${SOURCE_PATH}/countrycode.org/countrycodes.json`,
    })

    const countrycodes: CountryCodeFull[] = JSON.parse(bf.toString())
    const nextcountrycodes = countrycodes
    // .filter(e => e.ISO2 === 'CL')

    fs.writeFileSync(
        `${LIB_COUNTRYCODES_PATH}/countrycodes.json`,
        JSON.stringify(nextcountrycodes, null, 2)
    )

    writeLibItem({
        fileName: `countrycodes`,
        varName: `countrycodes`,
        body: nextcountrycodes,
    })

    for (const countrycode of nextcountrycodes) {
        writeLibItem({
            fileName: `countrycodes-${countrycode.ISO2}`,
            varName: `countrycodes${countrycode.ISO2}`,
            body: countrycode,
        })
    }
}
