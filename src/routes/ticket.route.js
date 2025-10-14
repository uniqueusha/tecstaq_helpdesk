const express = require('express')
const ticketController = require('../controllers/ticket.controller');
const router = express.Router();
const checkAuth = require('../middleware/check.auth');

//get department
router.post('/', checkAuth,ticketController.createTicket);

module.exports = router;