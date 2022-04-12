const debug = require('debug')('lesson:services');
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const sqs = new SQSClient({region: process.env.AWS_REGION});
const { createSlackLogger } = require('./bootstrap');

/**
 * AWS Lambda Handler function which receive an API Gateway webhook notifications to
 * process incoming data. The data on the HTTP event is parsed and enqueued (if applicable).
 * 
 * A message is logged to Slack if data is enqueued or if there is an error enqueuing the data.
 */
module.exports = async function (event, context) {
  // Defaults to respond to caller...
  let statusCode = 200; //by default
  let result = { success: true, message: 'OK'};

  let slack = createSlackLogger("RTR Lesson: Webhook Listener");

  try {
    if(event.body){
      debug(`Received webhook payload:\n${event.body}`);

      let sendMessageCmd = new SendMessageCommand({
        MessageBody: event.body,
        QueueUrl: process.env.QUEUE_URL,
        DelaySeconds: 0,
      });

      await sqs.send(sendMessageCmd);

      result.message = "Enqueued successfully.";
      
      await slack?.log(true, result.message, event.body);

    } else {
      result.message = "Nothing to enqueue.";
    }
    
  } catch (ex) {
    console.error(`Error handling webhook. ${ex.message}`);
    console.error(ex);
    
    statusCode = 500;
    result.success = false;
    result.message = `Error handling webhook. ${ex.message}`;

    await slack?.log(false, `Error handling webhook. ${ex.message}`, ex.stack);
  
  } finally {
    return {
      statusCode,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result)
    };
  }
}

