import { address } from "ip"

export const getLocalUrl = () => {
    const env = process.env.URL === "localhost" ? "dev" : "prod"
    const url = env === "dev" ? `http://${address("private")}:${process.env.PORT}` : process.env.URL
    return url
}
