const express = require('express')
const roleController = require('../controllers/role.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//all list
router.get('/', roleController.getAllRoles);
//active list  
router.get('/wma', roleController.getRolesWma);

module.exports = router