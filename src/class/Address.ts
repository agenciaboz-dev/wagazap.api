import { WithoutFunctions } from "./helpers"

export type AddressForm = Omit<WithoutFunctions<Address>, "id">

export class Address {
    cep: string
    uf: string
    city: string
    number: string
    district: string
    street: string
    complement: string | null

    constructor(data: Address) {
        this.cep = data.cep
        this.city = data.city
        this.complement = data.complement
        this.district = data.district
        this.number = data.number
        this.street = data.street
        this.uf = data.uf
    }

    format(options?: { short?: boolean }) {
        return options?.short
            ? `${this.street}, número ${this.number}${this.complement ? `, ${this.complement}` : ""}. ${this.district}`
            : `${this.street}, número ${this.number}${this.complement ? `, ${this.complement}` : ""}. ${this.district} - ${this.city} - ${this.uf}. ${
                  this.cep
              }`
    }
}
