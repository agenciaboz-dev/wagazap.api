export const slugify = (text: string): string => {
    return text
        .normalize("NFD") // Decompor em caracteres normais e diacríticos.
        .replace(/[\u0300-\u036f]/g, "") // Remover diacríticos (marcas de acento).
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "") // Remover caracteres que não são letras, números, espaços ou hífens.
        .replace(/\s+/g, "-") // Substituir espaços por hífens.
        .replace(/-+/g, "-") // Substituir múltiplos hífens por um único hífen.
        .replace(/^-+|-+$/g, "") // Remover hífens no início e no final da string.
}
