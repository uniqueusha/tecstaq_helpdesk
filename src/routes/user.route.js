const express = require('express')
const userController = require('../controllers/user.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//create organization
router.post('/', userController.createUser);
//login  
router.post('/login', userController.login);

module.exports = router