const express = require('express')
const ticketController = require('../controllers/ticket.controller');
const router = express.Router();
const checkAuth = require('../middleware/check.auth');

//get ticket
router.post('/', checkAuth,ticketController.createTicket);
//list ticket
router.get('/', ticketController.getAllTickets);
//status count
router.get('/status-count', ticketController.getTicketStatusCount);
//Month Wise Status Count
router.get('/month-wise-status-count', ticketController.getMonthWiseStatusCount);
//todat open ticket
router.get('/today-open-ticket', ticketController.getTodayOpenTicketList);
//doc download
router.get('/doc-download', ticketController.getDocumentDownload);
//download
router.get('/download', ticketController.getTicketDownload);
//status list
router.get('/status-list', ticketController.getStatusList);
//by id
router.get('/:id', ticketController.getTicket)
//update ticket
router.put('/:id', checkAuth,ticketController.updateTicket);

module.exports = router;