import { NextFunction, Request, Response } from "express"
import { Company } from "../class/Company"

export interface CompanyRequest extends Request {
    company?: Company
}

export const requireCompanyId = async (request: CompanyRequest, response: Response, next: NextFunction) => {
    const { company_id } = request.query

    if (!company_id) {
        return response.status(400).send("company_id param is required")
    }

    try {
        request.company = await Company.getById(company_id as string)
    } catch (error) {
        return response.status(400).send(error)
    }

    next()
}
