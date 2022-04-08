// Inject environment variable from .env file (assumed to be deployed with the distribution)
require('dotenv').config();

// Webhook triggered...
exports.handleMessageWebhook = require('./src/lambda-by-http');

// Polling triggered...
exports.pollForMessages = require('./src/lambda-poll');

// Process a message from a queue...
exports.processMessage = require('./src/lambda-by-sqs');
