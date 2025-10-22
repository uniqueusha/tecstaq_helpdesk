const express = require('express')
const userController = require('../controllers/user.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//create organization
router.post('/', userController.createUser);
//login  
router.post('/login', userController.login);
//send mail
router.post('/send-email', userController.sendEmail);
//all list
router.get('/', userController.getUsers);
//active list
router.get('/wma', userController.getUserWma);
// router.get('/test-mail', userController.testMail);
//active customer agent
router.get('/customer-wma', userController.getAgentsWma);
//active technician
router.get('/technician-wma', userController.getTechnicianWma);
//by id 
router.get('/:id', userController.getUser);
//update user
router.put('/:id', userController.updateUser);
//status change
router.patch('/:id', userController.onStatusChange)

module.exports = router