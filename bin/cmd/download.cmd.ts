import yargs from "yargs"

export = yargs.command(
    "download",
    "download",
    (argv) => argv.commandDir("download_cmd"),
    () => {}
)
