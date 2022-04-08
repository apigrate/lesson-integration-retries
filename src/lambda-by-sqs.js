const { createSlackLogger, createDebugLogger } = require('../bootstrap');
const { MessageProcessor } = require('./message-processor');
let sync = new MessageProcessor(app1, app2);

/**
 * AWS Lambda Handler function which receives SQS notifications.
 * 
 * Notes:
 * 1. When configuring the triggering, make sure to set the batch size = 1 for the SQS lambda trigger. This 
 * ensures the lambda is invoked once per each item in the queue.
 * 2. Messages are automatically deleted from the queue when the lambda returns successfully. 
 * 3. If it throws an error, the message stays in the the queue. 
 * 4. Depending on the redrive policy, a number of successive errors will eventually result in the 
 * message being placed in a SQS dead letter queue (which should not require additional configuration here
 * because DLQ configuration is configured in AWS for the Queue redrive policy)
 * 
 * Environment variables:
 * - PROCESSING_MODE: must be 'active' otherwise no processing is performed and the handler returns null.
 * - SLACK_WEBHOOK_URL: transaction logging endpoint for Slack
 * - DEBUG: (optional) debug category
 * - LOG_LEVEL: (optional) transaction log level
 */
module.exports = async function (event, context) {
  let record = event.Records[0];
  let result = null;//from the processing function
  let entity_link = null;
  let slackLogger = createSlackLogger();
  let debug = createDebugLogger('myapp:services', process.env.LOG_LEVEL || 'info')
  try {
    if (process.env.PROCESSING_MODE !== 'active') {
      debug(`Processing mode is not active.`);
      throw new ProcessingModeNotActiveWarning();
    }
    debug(`Received queued App1 data:\n${record.body}`);

    let entity = JSON.parse(record.body);
    
    entity_link = `https://xxx.app1.com/${entity.id}`;
    result = await sync.processEntity(entity);

    if (result.success) {
      await slackLogger.log(true,
        result.message,
        result.transcript,
        { messageId: record.messageId, entity_link: entity_link });
      return result;
    }

    throw new Error(result.error);

  } catch (ex) {
    if(ex instanceof ProcessingModeNotActiveWarning) throw ex; //leaves the message in the queue
    console.error(ex);
    console.error(`Error processing App1 entity to App2. ${ex.message}`);
    
    await slackLogger.log(false,
      result ? `${result.message} ${result.error}` : ex.message,
      result ? result.transcript : ex.stack,
      { messageId: record.messageId, entity_link: entity_link });
    
    throw ex;//leaves the message in the SQS queue.
  }
};

class ProcessingModeNotActiveWarning extends Error {};