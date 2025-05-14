import express, { Express, Request, Response } from 'express'
import { Department, DepartmentForm } from '../../class/Department'
import { CompanyRequest, requireCompanyId } from '../../middlewares/requireCompanyId'
import { DepartmentRequest, requireDepartmentId } from '../../middlewares/requireDepartmentId'
import { requireUserId, UserRequest } from '../../middlewares/requireUserId'
import { Log } from '../../class/Log'

const router = express.Router()

router.use(requireCompanyId)

router.get('/', async (request:CompanyRequest, response:Response) => {    
    const {department_id} = request.query
        try {
            if (department_id) {
                const department = await Department.find(department_id as string)
                return response.json(department)
            } else {
                const departments = request.company!.departments
                return response.json(departments)
            }
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }

})

router.use(requireUserId)

router.post('/', async (request:CompanyRequest & UserRequest, response:Response) => {    
    const data = request.body as DepartmentForm

    try {
        const department = await request.company!.newDepartment(data)
        Log.new({company_id: request.company!.id,  user_id: request.user!.id, type: 'departments', text: `criou o setor ${department.name}`})
        return response.json(department)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }

})

router.use(requireDepartmentId)

router.patch('/', async (request:DepartmentRequest & UserRequest, response:Response) => {    
    const data = request.body as Partial<DepartmentForm>

    try {
        const department = request.department!
        Log.new({company_id: request.company!.id,  user_id: request.user!.id, type: 'departments', text: `editou o setor ${department.name}`})
        await department.update(data)
        return response.json(department)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }

})

router.delete('/', async (request:DepartmentRequest & UserRequest, response:Response) => {    

    try {
        const department = request.department!
        await department.delete()
        Log.new({company_id: request.company!.id,  user_id: request.user!.id, type: 'departments', text: `deletou o setor ${department.name}`})
        return response.json(department)   
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }

})

export default router