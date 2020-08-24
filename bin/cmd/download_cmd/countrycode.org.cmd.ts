import yargs from "yargs"
import { run } from "./countrycode.org_lib/download_country_codes_countrycode.org"

export = yargs.command(
    ["countrycode.org", "countrycode"],
    "download source from countrycode.org",
    {},
    async () => {
        console.log("download from countrycode.org...")
        await run()
    }
)
