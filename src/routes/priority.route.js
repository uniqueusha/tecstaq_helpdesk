const express = require('express')
const priorityController = require('../controllers/priority.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//all list
router.get('/', priorityController.getAllPriorities);
//active list  
router.get('/wma', priorityController.getPriorityWma);

module.exports = router