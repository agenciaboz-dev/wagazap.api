import { readFileSync } from "fs"

export const file2base64 = (path: string) => {
    const buffer = readFileSync(path)
    return buffer.toString("base64")
}
