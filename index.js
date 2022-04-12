// Inject environment variable from .env file (assumed to be deployed with the distribution)
require('dotenv').config();

// Webhook triggered...
exports.handleWebhook = require('./src/lambda-http-listener');

// Process a message from a queue...
exports.processMessage = require('./src/lambda-queue-listener');

// Oversees DLQ processing, determining when/whether to retry records.
let createRetryHandler = require('./src/lambda-dlq-listener');
exports.processDLQMessage = createRetryHandler({ 
  attempt_counter_attribute_name: 'RetryAttempts',
  maximum_retries: 3,
  maximum_delay_s: 900, 
  retry_base_interval_s: 30,
  processing_queue_url: process.env.QUEUE_URL
});