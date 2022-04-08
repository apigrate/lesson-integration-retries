require('dotenv').config();

//Apigrate Slack Logger
const SlackLogger = require('@apigrate/slack');
exports.createSlackLogger=(name)=>{
  return new SlackLogger(
    process.env.SLACK_WEBHOOK_URL,
    `AWS ${process.env.NODE_ENV} environment`,
    name,
    {
      author_url: "https://www.apigrate.com",
      fields: {
        environment: process.env.NODE_ENV
      }
    }
  );
};