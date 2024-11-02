export interface TemplateInfo {
    name: string
    components: TemplateComponent[]
    language: "en_US" | "pt_BR"
    status: string
    category: string
    id: string
}

export interface TemplateComponent {
    type: "HEADER" | "FOOTER" | "BODY"
    format?: "IMAGE" | "TEXT" | "BUTTONS"
    text?: string
    buttons?: {
        type: "QUICK_REPLY"
        text: string
    }[]
}
