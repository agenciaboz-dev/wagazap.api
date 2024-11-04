export const getLocalUrl = () => {
    const port = process.env.PORT
    const url = `http://127.0.0.1:${port}`
    console.log(url)
    return url
}
