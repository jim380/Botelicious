// Native node http/https modules wrapped with promises 
let https = require('https');
let http = require('http');

// Connection over ssl is established using the following schema
// let fs  = require('fs');
// 
// let options = {
//   hostname: url,
//   port: port,
//   path: path,
//   method: 'GET',
//   key: fs.readFileSync('cert/key_338042844'),
//   cert: fs.readFileSync('cert/cert_936367665')
// };

module.exports = class httpUtil {

  httpsGetText(url, port, path) {
    let options = {
      hostname: url,
      port: port,
      path: path,
      method: 'GET',
      rejectUnauthorized: false  // security issue (hacky way to parse 1317)
    };
    // create new promise
    return new Promise((resolve, reject) => {
      https.request(options, (res) => {
        // response status check
        if (res.statusCode < 200 || res.statusCode > 299) {
          reject(new Error(`${new Date()} - rejection in httpsGetText with status ${res.statusCode}`));
        }
        // var to store res body
        let res_body = "";
        // get body (by chunks)
        res.on('data', (data) => {
          res_body += data;
        });
        // resolve promise(return body as text)
        res.on('end', () => {
          resolve(res_body);
        });
      }).on('error', () => {reject(new Error(`${new Date()} - request rejection in httpsGetText`))}).end();
    });
  }

  httpGetText(url, port, path) {
    let options = {
      hostname: url,
      port: port,
      path: path,
      method: 'GET'
    };
    // create new promise
    return new Promise((resolve, reject) => {
      http.request(options, (res) => {
        // response status check
        if (res.statusCode < 200 || res.statusCode > 299) {
          reject(new Error(`${new Date()} - rejection in httpGetText with status ${res.statusCode}`));
        }
        // var to store res body
        let res_body = "";
        // get body (by chunks)
        res.on('data', (data) => {
          res_body += data;
        });
        // resolve promise(return body as text)
        res.on('end', () => {
          resolve(res_body);
        });
      }).on('error', () => {reject(new Error(`${new Date()} - request rejection in httpGetText`))}).end();
    });
  }

  // Example of implementing custom request timeout
  httpsGetJson(url, port, path, req_timeout) {
    let options = {
      hostname: url,
      port: port,
      path: path,
      method: 'GET',
      rejectUnauthorized: false  // security issue (hacky way to parse 1317)
    };
    // create new promise
    return new Promise((resolve, reject) => {
      
      if (typeof req_timeout == "number") {
        setTimeout(() => {
          reject(new Error(`${new Date()} - ${req_timeout}s timeout exceeded`));  
        }, req_timeout*1000);
      }

      https.request(options, (res) => {
        // response status check
        if (res.statusCode < 200 || res.statusCode > 299) {
          reject(new Error(`${new Date()} - rejection in httpsGetJson with status ${res.statusCode}`));
        }
        // var to store res body
        let res_body = "";
        // get body (by chunks)
        res.on('data', (data) => {
          res_body += data;
        });
        // resolve promise(return body as json)
        res.on('end', () => {
          resolve(JSON.parse(res_body));
        });
      }).on('error', () => {reject(new Error(`${new Date()} - request rejection in httpsGetJson`))}).end();
    });
  }



  httpGetJson(url, port, path) {
    let options = {
      hostname: url,
      port: port,
      path: path,
      method: 'GET'
    };
    // create new promise
    return new Promise((resolve, reject) => {
      http.request(options, (res) => {
        // response status check
        if (res.statusCode < 200 || res.statusCode > 299) {
          reject(new Error(`${new Date()} - response issue in httpGetJson with status ${res.statusCode}`));
        }
        // var to store res body
        let res_body = "";
        // get body (by chunks)
        res.on('data', (data) => {
          res_body += data;
        });
        // resolve promise(return body as json)
        res.on('end', () => {
          resolve(JSON.parse(res_body));
        });
      }).on('error', () => {reject(new Error(`${new Date()} - request rejection in httpGetJson`))}).end();
    });
  }
}


