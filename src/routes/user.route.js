const express = require('express')
const userController = require('../controllers/user.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//create organization
router.post('/', userController.createUser);
//login  
router.post('/login', userController.login);
//all list
router.get('/', userController.getUsers);
//active list
router.get('/wma', userController.getUserWma);
//download user
router.get('/download', userController.getUserDownload);
// router.get('/test-mail', userController.testMail);
//active customer agent
router.get('/customer-wma', userController.getAgentsWma);
//active technician
router.get('/technician-wma', userController.getTechnicianWma);
//db download
router.get('/db-download', userController.getDB);
//by id 
router.get('/:id', userController.getUser);
//change password
router.put('/change-password',userController.onChangePassword);
//update user
router.put('/:id', userController.updateUser);
//status change
router.patch('/:id', userController.onStatusChange);

router.post('/send-otp',userController.sendOtp);
router.post('/verify-otp',userController.verifyOtp);
router.post('/check-emailid',userController.checkEmailId);
router.post('/forgot-Password',userController.forgotPassword);
router.post('/send-otp-if-email-not-exists',userController.sendOtpIfEmailIdNotExists);

//delete Technician
router.delete('/:id',userController.deleteTechnician);


module.exports = router