const express = require('express')
const userController = require('../controllers/user.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//create organization
router.post('/', userController.createUser);
//login  
router.post('/login', userController.login);
//send mail
router.post('/send-mail', userController.sendEmail)
//all list
router.get('/', userController.getUsers);
//active list
router.get('/wma', userController.getUserWma);
//active customer agent
router.get('/customer-wma', userController.getAgentsWma);

module.exports = router