export const getLocalUrl = () => {
    const port = process.env.PORT
    const url = process.env.URL
    console.log(url)
    return url
}
