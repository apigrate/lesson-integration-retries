const debug = require('debug')('myapp:services');
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const sqs = new SQSClient({region: process.env.AWS_REGION});
const { createSlackLogger } = require('../bootstrap');

/**
 * AWS Lambda Handler function which receives API Gateway webhook notifications to
 * process incoming data. The data on the HTTP event is parsed and enqueued (if applicable).
 * 
 * A message is logged to Slack if data is enqueued or if there is an error enqueuing the data.
 */
module.exports = async function (event, context) {
  let http_payload = null;
  let ref = null;
  let queue_payload = {}; // what will be enqueued into SQS
  let api_response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: ""
  };
  let slackLogger = createSlackLogger("myapp X to Y");

  try {
    // Parse the HTTP payload from the AWS event
    // http_payload = JSON.parse(event.body);      // for POST, PUT
    // http_payload = event.queryStringParameters; // for GET, DELETE

    debug(`Received webhook payload:\n${JSON.stringify(http_payload)}`);

    // A ref can be very useful for troubleshooting. 
    ref = `https://xxx.app1.com/${http_payload.object_id}`;

    // Build the queue payload...
    queue_payload = http_payload.id;

    // Enqueue a message for processing...
    if(queue_payload){
      let sendMessageCmd = new SendMessageCommand({
        MessageBody: JSON.stringify(queue_payload),
        QueueUrl: process.env.QUEUE_URL,
        DelaySeconds: 0,
      });

      await sqs.send(sendMessageCmd);

      await slackLogger.log(true, 'Enqueued ok.', null, { id: http_payload.object_id, ref });

      api_response.body = JSON.stringify({ success: true,  message: "Enqueued successfully." });
    
    } else {
      api_response.body = JSON.stringify({ success: true,  message: "Nothing to enqueue." });
    }
    api_response.statusCode = 200;
    
  } catch (ex) {
    console.error(ex);
    console.error(`Error handling webhook. ${ex.message}`);
    
    await slackLogger.log(false, ex.message, ex.stack, { id: http_payload.object_id, ref });

    api_response.statusCode = 500; // Note, returning non-2xx can cause some webhooks to be disabled. Be careful.

    api_response.body = JSON.stringify({ success: false,  message: "Error handling webhook.", error: ex.message });

  } finally {
    return api_response;
  }
}
