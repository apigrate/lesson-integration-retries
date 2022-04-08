const {DebugLogger} = require('@apigrate/logger');
const { app1, createDebugLogger } = require('./bootstrap');

/**
 * Process a message payload. 
 * 
 * A separate MessageProcessor class can be useful to encapsulate sync/transaction
 * processing separately from lambdas. This allows the processing logic to be used across
 * distinct types of triggering events.
 */
class MessageProcessor {
  constructor(app1, app2){
    //connector config
    this.app1 = app1;
    this.app2 = app2;
  }

  /**
   * Processes an Entity
   * @return an object of the form: 
   * @example
   * {
   *   success: boolean,
   *   message: string,
   *   error: string,
   *   transcript: string
   * } 
   */
  async processEntity(payload){
    let txnResp = {success: false, message: "", error: "", transcript: ""};
    let txnLogger = createDebugLogger("myapp", process.env.LOG_LEVEL || "warn");

    try {
      txnLogger.debug(`Received payload:\n${JSON.stringify(payload)}`);
      //Implement your processing here.
      //entity... 

      txnResp.success = true;

    } catch (ex) {
      txnLogger.error(`Error processing payload. ${ex.message}`);
      txnLogger.error(ex.stack);

      txnResp.success = false;
      txnResp.message = `Error processing payload.`;
      txnResp.error = ex.message;

    } finally {
      txnResp.transcript = txnLogger.transcript();
      return txnResp;
    }
  }
}
exports.MessageProcessor = MessageProcessor;