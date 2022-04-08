const debug = require('debug')('myapp:services');
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const sqs = new SQSClient({region: process.env.AWS_REGION});

/**
 * AWS Lambda Handler function which polls for entity updates.
 * 
 * Environment variables:
 * - PROCESSING_MODE: must be 'active' otherwise no polling is performed.
 * - QUEUE_URL: sqs queue where data is deposited
 * - DEBUG: (optional) debug category
 * 
 * Note the event and context parameters are not used. This lambda can be triggered
 * by API Gateway or by a CloudWatch Events Rule if desired.
 */
module.exports = async function (event, context) {

  let apiResponse = {};
  try {
   
    if (process.env.PROCESSING_MODE === 'active') {
      debug(`Checking for updates...`);
      let pollResults = null; //TODO: some polling function you have to provide

      // assuming a hypothetical account entity
      debug(`Detected ${pollResults.entities.length} updates.`);
      for (let entity of pollResults.entities) {
        try {
          
          // Assemble the enqueue payload...
          let enqueue_payload = {
            entity
          };

          // Enqueue a message for processing...
          let sendMessageCmd = new SendMessageCommand({
            MessageBody: JSON.stringify(enqueue_payload),
            QueueUrl: process.env.QUEUE_URL,
            DelaySeconds: 0,
          });

          await sqs.send(sendMessageCmd)

        } catch (ex) {
          console.error(ex);
        }
      }

      if (pollResults.entities) {
        apiResponse.count = pollResults.entities.length;
      }
    } else {
      debug(`Polling is paused. Retrieval queries are not being executed.`)
    }
    return apiResponse;

  } catch (ex) {
    console.error(ex);
    console.error(`Error polling for updates. ${ex.message}`);
    throw ex;
  }
}
