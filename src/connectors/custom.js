const fetch = require('node-fetch');
const qs = require('query-string');
const debug = require('debug')('customapp');
const verbose = require('debug')('customapp:verbose');
/**
 * A nodeJS component wrapping a custom application API.
 * 
 * This example shows a BASIC authentication API (based on Zendesk, actually).
 * 
 * Customize it as you need
 */
class CustomAppConnector {
  constructor(email, token, subdomain){
    this.email=email;
    this.token=token;
    this.subdomain=subdomain;
  }

  //
  // Tickets
  //
  async getTicket(ticket_id){
    return this.doFetch("GET",`/tickets/${ticket_id}.json`);
  }

  async getTicketComments(ticket_id){
    return this.doFetch("GET",`/tickets/${ticket_id}/comments.json`);
  }

  //
  // Users
  //
  async getUserDetails(user_id){
    return this.doFetch("GET",`/users/${user_id}.json`);
  }

  /**
   * Internal method to make an API call using node-fetch.
   * 
   * @param {string} method GET|POST|PUT|DELETE
   * @param {string} url api url fragment after the base URL (beginning with a slash) (without query parameters)
   * @param {object} query hash of query string parameters to be added to the url
   * @param {object} payload for POST, PUT methods, the data payload to be sent
   */
  async doFetch(method, url, query, payload){
    
    let fetchOpts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Apigrate NodeJS CustomAppConnector/1.0.0",
        // eslint-disable-next-line no-undef
        "Authorization" : "Basic " + Buffer.from(`${this.email}/token:${this.token}`).toString('base64')
      },
    };
    
    let qstring = '';
    if(query){
      qstring = qs.stringify(query);
      qstring = '?'+qstring;
    }
    let full_url = `https://${this.subdomain}.customapp.com/api/v2${url}${qstring}`;
    

    if(payload){
      fetchOpts.body = JSON.stringify(payload);
    }

    let content = null;
    try{
      debug(`${method} ${full_url}`);
      verbose(`  payload: ${JSON.stringify(payload)}`);
      
      let response = await fetch(full_url, fetchOpts);

      // Get the content.
      let ctype = response.headers.get("Content-Type");
      if(ctype && ctype.includes("/json")){
        content = await response.json();
      } else {
        content = await response.text();
      }

      // Evaluate the response
      if(response.ok){
        debug(`  ...OK HTTP-${response.status}`);
        verbose(`  response payload: ${JSON.stringify(content)}`);
        return content;
      }

      if(!response.ok){
        this.handleNotOk(response.status, content, ctype && ctype.includes("/json"));
      }

    }catch(err){
      if(err instanceof ApiError) throw err;
      //Unhandled errors are noted and re-thrown.
      console.error(err);
      throw err;
    }
  }

  /**
   * Handles API errors in a consistent manner.
   * @param {number} status
   * @param {any} content the content returned on the response.
   * @param {boolean} is_content_json indicates whether content is JSON
   */
  async handleNotOk(status, content){
    debug(`  ...Error. HTTP-${status}`);
    if (status >=300 & status < 400){
      return content;

    } else if (status >=400 & status < 500){
      if(status === 401 || status === 403){
        //If OAuth, catch this error to retry after refreshing tokens. 
        throw new ApiAuthError("Authorization error.", status, content);
      }

      throw new ApiError("Client error.", status, content);

    } else if (status >=500) {
      throw new ApiError("Server error.", status, content);
    
    }
  }

}

class ApiError extends Error {
  constructor(msg, status, data){
    super(msg);
    this.status = status;
    this.data = data;
  }
}
class ApiAuthError extends ApiError {}
exports.CustomAppConnector = CustomAppConnector;
exports.ApiError = ApiError;
exports.ApiAuthError = ApiAuthError;