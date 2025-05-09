export const normalizePhoneNumber = (phone: string) => {
    const clean = phone.replace(/\D/g, "").replace(/^0+|^55+/g, "")
    return clean.replace(/^(\d{2})9(\d{8})$/, "$1$2")
}

export function normalizeContactId(id: string) {
    return id.replace(/(\d+)(:\d+)?(@c\.us)$/, "$1$3")
}