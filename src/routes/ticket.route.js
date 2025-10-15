const express = require('express')
const ticketController = require('../controllers/ticket.controller');
const router = express.Router();
const checkAuth = require('../middleware/check.auth');

//get ticket
router.post('/', checkAuth,ticketController.createTicket);
//list ticket
router.get('/', ticketController.getAllTickets);
//by id
router.get('/:id', ticketController.getTicket)
//update ticket
router.put('/:id', checkAuth,ticketController.updateTicket);

module.exports = router;