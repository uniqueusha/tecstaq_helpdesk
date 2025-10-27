const express = require('express')
const departmentController = require('../controllers/deparment.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//create department
router.post('/', departmentController.createDepartment);
//get department
router.get('/', departmentController.getAllDepartment);
//download
router.get('/download', departmentController.getDepartmentDownload);
//active list
router.get('/wma', departmentController.getDepartmentsWma);
//get id by department
router.get('/:id', departmentController.getDepartment);
//update department
router.put('/:id', departmentController.updateDepartment);
//status change
router.patch('/:id', departmentController.onStatusChange);


module.exports = router