const express = require('express')
const ticketCategoryController = require('../controllers/ticket-categories.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth');


//get ticket category
router.post('/',ticketCategoryController.createTicketCategories);
router.get('/', ticketCategoryController.getAllTicketCategories);
router.get('/wma', ticketCategoryController.getTicketCategoriesWma);
router.get('/download', ticketCategoryController.getTicketCategoriesDownload);
router.get('/:id', ticketCategoryController.getTicketCategories);
router.put('/:id', ticketCategoryController.updateTicketCategories);
router.patch('/:id', ticketCategoryController.onStatusChange);
module.exports = router