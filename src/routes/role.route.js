const express = require('express')
const roleController = require('../controllers/role.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//create role
router.post('/', roleController.createRole);
//all list
router.get('/', roleController.getAllRoles);
//download
router.get('/download', roleController.getRoleDownload);
//active list  
router.get('/wma', roleController.getRolesWma);
//by id
router.get('/:id', roleController.getRole);
//update role
router.put('/:id', roleController.updateRole);
//status change
router.patch('/:id', roleController.onStatusChange)

module.exports = router