const debug = require('debug')('lesson:services');
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const sqs = new SQSClient({region: process.env.AWS_REGION});
const { createSlackLogger, createTranscriptLogger } = require('./bootstrap');

/**
 * Returns a Lambda handler that can be used to monitor dead-letter queues for retry processing.
 * 
 * When the batch of messages is received from SQS, the lambda processes each record of the batch as follows:
 * 1. the message is examined for a MessageAttribute containing the attempt counter (see `attempt_counter_attribute_name` below).
 * 1. when a counter is found, it is compared to the maximum retries parameter (see `maximum_retries` below). When the retry attempts is less than or equal to the max:
 *    1. the attempt counter is incremented.
 *    1. an exponential backoff delay is calculated for the next retry.
 *    1. a new SQS message is constructed with the contents of the orginal message and the aforementioned MessageAttribute (attempt counter) and Delay.
 *    1. the new SQS message is inserted into the orginal queue (see `processing_queue_url` below).
 * 
 * 
 * @param {*} param0
 * @param {string} param0.attempt_counter_attribute_name name of the SQS MessageAttribute that will contain the persistent retry attempt counter. Defaults to 'RetryAttempts'.
 * @param {number} param0.maximum_retries the maximum number of times a message will be retried. Defaults to 3.
 * @param {number} param0.maximum_delay_s the maximum delay (in seconds) that can be applied to a message before it is retried. Defaults to the Amazon SQS limit of 15 minutes = 900s.
 * @param {number} param0.retry_base_interval_s the earliest possible delay for the initial retry attempt (this will be doubled according to the backoff algorithm on subsequent attempts). Defaults to 30s.
 * @param {string} processing_queue_url the url of the SQS Queue that should be used to receive the retry attempt.
 * 
 * @returns {function} lambda handling function
 */
module.exports = function({ attempt_counter_attribute_name, maximum_retries, maximum_delay_s, retry_base_interval_s, processing_queue_url}){

  if(!attempt_counter_attribute_name) attempt_counter_attribute_name = "RetryAttempts";
  if(!maximum_retries) maximum_retries = 3;
  if(!maximum_delay_s || maximum_delay_s > 900) maximum_delay_s = 900; // (Amazon SQS Limit maximum is 15 minutes = 900s)
  if(!retry_base_interval_s) retry_base_interval_s = 30; //The earliest a retried message would be processed.

  /**
   * The lambda function to return.
   */
  return async function (event, context) {

    let slack = createSlackLogger("RTR Lesson: Dead Letter Retry Listener");
    let logger = createTranscriptLogger('lesson', process.env.LOG_LEVEL || 'info');

    let batchItemFailures = [];

    for(let record of event.Records){
      let attempt = 0;
      try {
        logger.info(`Checking message ${record.messageId}...`);
        logger.info(`  payload: \n${record.body}`);

        // Parse the attempt counter messageAttribute.
        let attemptCounterAttribute = record.messageAttributes[ attempt_counter_attribute_name ];
        if(attemptCounterAttribute){
          attempt = Number.parseInt(attemptCounterAttribute.stringValue);
          logger.info(`...it has been retried ${attempt} times before.`);
        }
        
        // Retry the message if it hasn't exceeded the configured maximum number of retries.
        if(attempt < maximum_retries){
  
          // Increment the attempt counter.
          attempt++;
  
          // Implement an Exponential backoff (delay) with jitter (i.e. randomness)
          let delay_in_seconds = calculateExponentialDelayFor(attempt); 
  
          // Initialize the new message
          let sendMessageCmdInput =  {
            MessageBody: record.body,
            QueueUrl: processing_queue_url,
            DelaySeconds: delay_in_seconds,
            MessageAttributes: {}
          };

          // Store the attempt counter on a new message as a Message Attribute.
          sendMessageCmdInput.MessageAttributes[ attempt_counter_attribute_name ] =  {
            DataType: 'Number',
            StringValue: `${attempt}`
          }
  
          // Place back in the original queue to be retried.
          let sendMessageCmd = new SendMessageCommand(sendMessageCmdInput);
          await sqs.send(sendMessageCmd);
  
          await slack?.log(true, `Attempt ${attempt}: retrying message in ${delay_in_seconds} seconds.`, logger.transcript());
  
        } else {
          await slack?.log(true, `Message has already been retried ${attempt} times and won't be retried again.`, logger.transcript());

          //Note: by default the message will be deleted. It may advisable to do something else with it after all retries have failed. 

        }
        
      } catch (ex) {
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

  /**
   * Returns the number of seconds the record will be delayed from being processed. This provides an 
   * exponential backoff mechanism for retries.
   * 
   * The algorithm used is an exponential (2 ^ n-1) backoff where n is the number of attempts.
   * It also builds in randomness (i.e. "jitter") which spreads out many concurrent requests in
   * order to prevent retry "clumping" concurrency.
   * 
   * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
   * @param {number} attempt 
   */
  function calculateExponentialDelayFor(attempt){
    let doubling_delay = retry_base_interval_s * Math.pow(2, attempt - 1); // 2nd retry doubled, 3rd retry quadrupled etc...
    let randomized_delay_up_to_max = Math.random() * maximum_delay_s; // "jitter"
    let actual_delay =  Math.floor( Math.min(randomized_delay_up_to_max, doubling_delay) ); // whichever is less.
    debug(`Calculated actual delay: ${actual_delay} s`);
    return actual_delay;
  }

};

