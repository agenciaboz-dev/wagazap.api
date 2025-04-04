export const normalizePhoneNumber = (phone: string) => {
    const clean = phone.replace(/\D/g, "").replace(/^0+|^55+/g, "")
    return clean.replace(/^(\d{2})9(\d{8})$/, "$1$2")
}