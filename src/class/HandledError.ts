import { WithoutFunctions } from "./helpers"

export enum HandledErrorCode {
    no_nagazap = 1,
}

export class HandledError {
    text: string
    code: HandledErrorCode

    constructor(data: WithoutFunctions<HandledError>) {
        this.text = data.text
        this.code = data.code
    }
}
