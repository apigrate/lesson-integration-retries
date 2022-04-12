const { createSlackLogger, createTranscriptLogger } = require('./bootstrap');
const { ErringProcessor } = require('./erring-message-processor');

/**
 * AWS Lambda Handler function which receives SQS notifications and processes messages.
 */
module.exports = async function (event, context) {

  let slack = createSlackLogger("RTR Lesson: Processing Queue Listener");
  let logger = createTranscriptLogger('lesson', process.env.LOG_LEVEL || 'info');
  let batchItemFailures = [];
  
  for(let record of event.Records){
    try {
      logger.info(`Processing record:\n${record.body}`);

      // It is often useful to have processing logic encapsulated in a separate class.
      let messageProcessor = new ErringProcessor(0.25, 'VOLDEMORT');

      let {success, message, error, transcript} = await messageProcessor.process(record.body);

      if (success) {
        await slack?.log(true, message, transcript, { messageId: record.messageId });
      } else {
        throw new Error(error || "Processing error");
      }

    } catch (ex) {
      if(ex instanceof ProcessingModeNotActiveWarning) throw ex; //leaves the message in the queue
      console.error(ex);
      console.error(`Error processing record. ${ex.message}`);

      // For reference on how to signal that individual SQS records failed, see these helpful links:
      // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
      // https://github.com/aws/serverless-application-model/issues/2256
      // https://awslabs.github.io/aws-lambda-powertools-python/latest/utilities/batch/#required-resources
      batchItemFailures.push({ itemIdentifier: record.messageId }); 
      
      await slack?.log(false, ex.message, ex.stack, { messageId: record.messageId } );
      
    }
    
  } // loop through records

  return { batchItemFailures };
};

class ProcessingModeNotActiveWarning extends Error {};