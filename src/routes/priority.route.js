const express = require('express')
const priorityController = require('../controllers/priority.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

router.post('/', priorityController.addPriority);
//all list
router.get('/', priorityController.getAllPriorities);
//active list  
router.get('/wma', priorityController.getPriorityWma);
//download
router.get('/download', priorityController.getPriorityDownload);
//get list by id
router.get('/:id', priorityController.getPriority);
// update priority
router.put('/:id', priorityController.updatePriority);
//update status
router.patch('/:id', priorityController.onStatusChange);


module.exports = router