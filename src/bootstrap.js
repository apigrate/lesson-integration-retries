require('dotenv').config();

// Apigrate Transcript Logger
const { DebugLogger } = require('@apigrate/logger');
exports.createTranscriptLogger = (pattern, level, opts) => { 
  return new DebugLogger(pattern, level, opts); 
};

// Apigrate Slack Logger
const SlackLogger = require('@apigrate/slack');
/**
 * Creates a slack logging utility that can be used to post messages to Slack.
 * @param {string} name the App Name associated with the messages the logger will produce.
 * @returns a slack logging utility when `process.env.SLACK_WEBHOOK_URL` is configured, null otherwise.
 */
exports.createSlackLogger=(name)=>{
  if(!process.env.SLACK_WEBHOOK_URL) return null;

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