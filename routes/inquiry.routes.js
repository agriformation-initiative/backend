const express = require('express');
const { createInquiry } = require('../controllers/inquiry.controller');

const router = express.Router();

router.post('/', createInquiry);

module.exports = router;
