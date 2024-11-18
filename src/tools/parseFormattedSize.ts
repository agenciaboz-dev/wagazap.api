export const parseFormattedSize = (formattedSize: string): number => {
    const units: { [unit: string]: number } = { b: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
    const regex = /(\d+(?:\.\d+)?)\s*([KMGT]?B)/
    const matches = formattedSize.toUpperCase().match(regex)
    if (matches && units[matches[2]]) {
        return parseFloat(matches[1]) * units[matches[2]]
    }

    console.log({ formattedSize, matches })
    throw new Error("Invalid formatted size")
}
