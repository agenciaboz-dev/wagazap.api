import { NextFunction, Response } from "express"
import { CompanyRequest } from "./requireCompanyId"
import { Department } from "../class/Department"

export interface DepartmentRequest extends CompanyRequest {
    department?: Department
}

export const requireDepartmentId = async (request: DepartmentRequest, response: Response, next: NextFunction) => {
    const { department_id } = request.query

    if (!department_id) {
        return response.status(400).send("department_id param is required")
    }

    request.department = await Department.find(department_id as string)

    next()
}