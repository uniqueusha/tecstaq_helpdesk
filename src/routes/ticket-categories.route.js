const express = require('express')
const ticketCategoryController = require('../controllers/ticket-categories.controller')
const router = express.Router();
const checkAuth = require('../middleware/check.auth')

//get department
router.get('/', ticketCategoryController.getAllTicketCategories);
router.get('/wma', ticketCategoryController.getTicketCategoriesWma);

module.exports = router