export interface MessageWebhook {
    object: "whatsapp_business_account"
    entry: [
        {
            id: string // businessId
            changes: [
                {
                    value: {
                        messaging_product: "whatsapp"
                        metadata: {
                            display_phone_number: string // nosso number
                            phone_number_id: string
                        }
                        contacts: [
                            {
                                profile: {
                                    name: string // nome do contato
                                }
                                wa_id: string // numero do contato
                            }
                        ]
                        messages: [
                            {
                                from: string // remetente
                                id: string
                                timestamp: string // unix timestamp, multiply by 1000 to get javascript timestamp
                                text?: {
                                    body: string // message text
                                }
                                button?: { payload: string; text: string }
                                type: "text"
                            }
                        ]
                    }
                    field: string
                }
            ]
        }
    ]
}
