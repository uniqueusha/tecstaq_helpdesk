const express = require('express')
const departmentController = require('../controllers/deparment.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//get department
router.get('/', departmentController.getAllDepartment);
router.get('/wma', departmentController.getDepartmentsWma);

module.exports = router