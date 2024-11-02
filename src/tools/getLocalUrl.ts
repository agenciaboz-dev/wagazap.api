import ip from "ip"

export const getLocalUrl = () => {
    const local_ip = ip.address()
    const port = process.env.PORT
    const url = `http://${local_ip}:${port}`
    console.log(url)
    return url
}
