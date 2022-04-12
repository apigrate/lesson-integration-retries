const { createTranscriptLogger } = require('./bootstrap');

/**
 * Processing class that errors at a configurable rate.
 */
class ErringProcessor {
  /**
   * 
   * @param {number} error_rate between 0 and 1.
   * @param {string} error_pattern regular expression to be applied to the payload (multiline). If a match occurs, the 
   * payload will always err.
   */
  constructor(error_rate, error_pattern){ 
    this.error_rate = error_rate || 0.25;
    this.error_pattern = error_pattern;
  }

  /**
   * @param {string} payload 
   * @returns {sucess, message, error, transcript}
   */
  async process(payload){
    let txnResp = {success: false, message: "", error: "", transcript: ""};
    let logger = createTranscriptLogger("lesson", process.env.LOG_LEVEL || "info");

    try {
      logger.info(`Received payload:\n${payload}. There is a ${Math.round(100*this.error_rate)}% chance of failure.`);
       
      if( Math.random() < this.error_rate ){
        txnResp.success = false;
        txnResp.message, txnResp.error = `Error processing payload (randomly determined).`;
        
      } else {
        if(this.error_pattern){
          let regex = new RegExp(this.error_pattern, 'm');
          let regexFail = regex.test( payload );
          if(regexFail){
            txnResp.message, txnResp.error = `Error processing payload (regex rejected payload).`;
            txnResp.success = false;
            logger.info(txnResp.message);
            return;
          }
         
        }
        txnResp.success = true;
        txnResp.message = `Successfully processed payload.`;
      }

      logger.info(txnResp.message);

    } catch (ex) {
      txnResp.success = false;
      txnResp.message = `Error processing payload. ${ex.message}`;
      txnResp.error = ex.message;

      logger.error(txnResp.message);
      logger.error(ex.stack);

    } finally {
      txnResp.transcript = logger.transcript();
      return txnResp;
    }
  }
}
exports.ErringProcessor = ErringProcessor;