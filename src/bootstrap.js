require('dotenv').config();
const { CustomAppConnector } = require('./connectors/custom'); 
const { AutotaskRestApi } = require('@apigrate/autotask-restapi');

/**
 * Example of getting a Custom App API connector.
 * @returns a CustomApp connector ready to use
 */
exports.getCustomAppConnector = () => {
  return new CustomAppConnector();
};

/**
 * Get an Autotask API connector. (another example))
 * @returns an AutotaskRestApi connector ready to use (no need to invoke .api() again)
 */
// exports.getAutotaskConnector = async ()=>{
//   let atrest = new AutotaskRestApi(process.env.AUTOTASK_API_USER, process.env.AUTOTASK_API_SECRET, process.env.AUTOTASK_INTEGRATION_CODE);
//   return await atrest.api();
// };

// Apigrate Logger
const { DebugLogger } = require('@apigrate/logger');
exports.createDebugLogger = (pattern, level, opts) => { 
  return new DebugLogger(pattern, level, opts); 
};

//Apigrate Slack Logger
const SlackLogger = require('@apigrate/slack');
exports.createSlackLogger=(name)=>{
  return new SlackLogger(
    process.env.SLACK_WEBHOOK_URL,
    `AWS ${process.env.NODE_ENV} environment`,
    name,
    {
      author_url: "https://github.com/apigrate/css-iht",
      fields: {
        environment: process.env.NODE_ENV
      }
    }
  );
};