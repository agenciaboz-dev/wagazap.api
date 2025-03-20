import { Prisma } from "@prisma/client";
import { WithoutFunctions } from "./helpers";
import { prisma } from "../prisma";
import { User } from "./User";

export const department_include = Prisma.validator<Prisma.DepartmentInclude>()({users: {select: {id: true, name: true}}})
export type DepartmentPrisma = Prisma.DepartmentGetPayload<{include: typeof department_include}>
export type DepartmentForm = Omit<WithoutFunctions<Department>, 'id' | 'company_id' | 'users'> & {users: User[]}
export interface DepartmentUserInfo {id: string, name: string}

export class Department {
    id: string
    name: string
    company_id: string
    users: DepartmentUserInfo[]

    static async find(id: string, options?: {users?: boolean}) {
        const result = await prisma.department.findUnique({ where: { id }, include: department_include})
        if (!result) throw 'setor não encontrado'

        return new Department(result)
    }

    constructor(data: DepartmentPrisma) {
        this.id = data.id
        this.name = data.name
        this.company_id = data.company_id
        this.users = data.users
    }
    
    load(data: DepartmentPrisma) {
        this.id = data.id
        this.name = data.name
        this.company_id = data.company_id
        this.users = data.users
    }

    async update(data: Partial<DepartmentForm>) {
        const result = await prisma.department.update({
            where: { id: this.id }, data: {
                name: data.name,
                users: data.users ? {set: [], connect: data.users.map(item => ({id: item.id})) } : undefined
        }, include: department_include})

        this.load(result)   
        return result
    }

    async delete() {
        const result = await prisma.department.delete({where: {id: this.id}})
        return result
    }
}