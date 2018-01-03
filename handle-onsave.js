//
//
//
//
/**
 * Authentication to be able to send the assembly source code to
 * the websocket seems to be in 4 (3 needed?) stages
 * 1) authenticate with user/pass to url auth.re.php
 * 2) Use the cookie from 1) to request a token from getServerInfo.php
 * 3) Open connection to websocket using cookie from 1)
 * 4) send the token obtained from 2) to the socket as a message
 * 
 * 5) Then parse the reply on the websocket relating to the code
 * to check it was recieved.
 * 
 * NOTE: these requests can't be interleaved, otherwise it invalidates
 * the token stored in the mysql database which is sent to the websocket
 * 
 */


var events = require('events');
//var cookie = require('cookie');
var url = require("url");
var querystring = require('querystring');
const WebSocket = require('ws');
var fs = require('fs');
var path = require('path');

/**
 * commonjs
 */
module.exports = function () {
  var module = {};

  module.uploadfile = uploadfile;

  return module;
};

/**
 * Exposed method to upload the mar files to the server
 * @param {object} config - hash of url, username, password
 * @param {string} filepath - full path to targetfile
 */
var uploadfile = function (config, filepath, vscode) {

  var eventEmitter = new events.EventEmitter();

  //store cookie, token, ws address, serverInfo for the duration
  var cookies = {};

  // generate urls for the auth and info pages
  const urlstring = url.resolve(config.url + '/', "auth.re.php");
  const token_urlstring = url.resolve(config.url + '/', "getServerInfo.php");

  //auth.re.php takes credentials as body of POST
  var post_data = querystring.stringify({
    'username': config.username,
    'password': config.password
  });

  // bleh
  var parsedurl = url.parse(urlstring);
  var http;

  //assume that the protocol is the same between the auth and the token
  if (parsedurl.protocol == 'http:') {
    http = require("http");
    parsedurl.port = parsedurl.port || 80;
  } else {
    http = require("https");
    parsedurl.port = parsedurl.port || 443;
  }

  var post_options = {
    hostname: parsedurl.hostname,
    port: parsedurl.port,
    method: 'POST',
    path: parsedurl.path,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(post_data)
    }
  };

  // Set up the request
  var post_req = http.request(post_options,
    function (response) {
      response.setEncoding('utf8');

      switch (response.statusCode) {
        case 200:
          // ok-continue
          break;
        case 500:
          eventEmitter.emit('error', 'status-error from auth: (PHP or MySQL??)' + response.statusCode);

          //don't process if we recieved a 500 error
          return;

      }


      var data = "";
      response.on(
        "data",
        function (chunk) {
          data += chunk;
        }
      );

      response.on(
        "end",
        () => {

          var setcookie = response.headers["set-cookie"];

          if (setcookie) {
            setcookie.forEach(
              function (cookiestr) {

                if (cookiestr.startsWith('marSession')) {
                  cookies['marSession'] = cookiestr.split(';')[0].split('=')[1];
                  eventEmitter.emit('got-cookie');

                } else if (cookiestr.startsWith('login=Username+or+password+incorrect')) {

                  console.log("COOKIE:ERROR:" + cookiestr);
                  eventEmitter.emit('error', 'login-error in cookie string (Check User/Pass)');

                } else {

                  console.log("DIDN'T RECOGNISE COOKIE:" + cookiestr);
                  eventEmitter.emit('error', "DIDN'T RECOGNISE COOKIE: " + cookiestr);
                }
              }
            );

            // if (!cookies['marSession']) {
            //   eventEmitter.emit('error', "DIDN'T match marcookie");
            // }

          } else {
            console.log("COOKIE:ERROR:NO-COOKIE");
            eventEmitter.emit('error', 'no-cookie returned');
          }
        }
      );
    });

  post_req.on(
    "error",
    function (err) {
      eventEmitter.emit('error', 'network-error at AUTH (check URL in Settings)', err);
    }
  );

  // post the data
  post_req.write(post_data);

  // this actally sends the request
  post_req.end();

  /**
   * once we have authenticated against the server 
   * and have cookie available
   */
  eventEmitter.on('got-cookie', () => {

    var parsedurl = url.parse(token_urlstring);

    var token_options = {
      hostname: parsedurl.hostname,
      port: parsedurl.port,
      method: 'GET',
      path: parsedurl.path,
      headers: {
        'Cookie': 'marSession=' + cookies['marSession'] + '; path=/'
      }
    };

    var token_req = http.request(token_options,
      function (response) {
        response.setEncoding('utf8');

        switch (response.statusCode) {
          case 200:
            // ok-continue
            break;
          case 500:
            eventEmitter.emit('error', 'status-error from token: ' + response.statusCode);

            //don't process if we recieved a 500 error
            return;

        }

        var data = "";
        response.on(
          "data",
          function (chunk) {
            data += chunk;
          }
        );

        /**
         response looks like
         {
    "address": "wss://muchassemblyrequired.com:443/socket",
    "serverName": "Official MAR server",
    "tickLength": 1000,
    "token": "1a54d0e570b...snip...d80841c6ff1b3c3714825",
    "username": "XXX"
          } 

        need token and address fields...
         */
        response.on(
          "end",
          () => {
            //console.log("at end");
            cookies['ServerInfo'] = JSON.parse(data);
            //console.log("token is " + cookies['ServerInfo'].token);
            //console.log("STATUS:" + response.statusCode);
            //console.log("  DATA:" + data);

            if (cookies['ServerInfo'].token.startsWith('000000000')) {

              eventEmitter.emit('error', 'token suggests not authenticated',
                cookies['ServerInfo'].token);
            } else {

              eventEmitter.emit('got-token');
            }

          }
        );


      });

    token_req.on(
      "error",
      function (err) {
        eventEmitter.emit('error', 'network-error in token request (??)', err);
      }
    );

    // this actally sends the request
    token_req.end();
  });

  /**
   * the token looks like
   * 4b633f848f491986bc48a8c9efd3059161d91d097df115d999f14
   * a73941e9ba13728ddff95f2fdc117908f65fcbd45d479d9cc831d
   * cf212a6d4962910526fcd5
   * needs to be passed to the websocket to authenticate
   */
  eventEmitter.on('got-token', () => {
    //console.log("got-token- opening websocket");

    const ws = new WebSocket(cookies['ServerInfo'].address, {
      perMessageDeflate: false,
      'headers': {
        'Cookie': 'marSession=' + cookies['marSession']
      },
      handshakeTimeout: 5000
    }, {
      handshakeTimeout: 5000
    });

    // websocket needs the token sent to it bare...
    ws.on('open', function open() {
      eventEmitter.emit('debug', "WebSocket:Open:OK, sending token to websocket");
      ws.send(cookies['ServerInfo'].token);

      //save the websocket in the global so we can close it later
      cookies['websocket'] = ws;
    });

    ws.on('error', function (error) {
      eventEmitter.emit('error', 'No webSocket (Server backend is Down!)', error);
    });

    var tick_counter = 0;
    //store messages for debugging
    var message_stack = [];

    ws.on('message', function incoming(data) {
      eventEmitter.emit('debug', "WebSocket:onmessage", data);

      var message = JSON.parse(data);

      if (message) {
        message_stack.push(message);
        if (message.t) {

          switch (message.t) {
            // responds with {t: "auth", m: "ok"}
            case 'auth':
              if (message.m == 'ok') {
                //console.log("WebSocket:AUTH:OK");
                fs.readFile(filepath, 'utf8', function (err, data) {
                  if (err) {
                    eventEmitter.emit('error',
                      "code read error (couldn't send file)", err);

                  } else {
                    cookies['websocket'].send(JSON.stringify({
                      t: 'uploadCode',
                      code: data
                    }));
                    message_stack.push('uploadCode');
                  }
                });
              }
              break;
              //{"t":"codeResponse","bytes":1672}
            case 'codeResponse':
              if (message.bytes) {
                //console.log("WebSocket:codeResponse:OK");
                const NORMAL_CLOSE = 1000;
                var ws = cookies['websocket'];
                ws.close(NORMAL_CLOSE, 'Upload Complete');
                //console.log("WebSocket:Closing and going away ...");

                vscode.window.setStatusBarMessage('File Uploaded - ' + vscode.window.activeTextEditor.document.uri.fsPath +
                  ' to ' + config.url, 10000);
              }
              break;
            case 'tick':
              eventEmitter.emit('debug', "tick from websocket - counting");
              tick_counter++;

              if (tick_counter > 10) {
                eventEmitter.emit('error', "too many ticks (Don't Submit too fast)",
                  message_stack);
              }

              break;
            default:
              console.log("WebSocket:AUTH:URL:" + cookies['ServerInfo'].address);
              console.log("WebSocket:AUTH:DATA:" + data);
              console.log(message.t);
              tick_counter++;

              if (tick_counter > 10) {
                eventEmitter.emit('error', "too many ticks (Don't Submit too fast)",
                  message_stack);
              }
              break;
          }
        } else {
          console.log("WebSocket:OTHER:URL:" + cookies['ServerInfo'].address);
          console.log("WebSocket:SOME MESSAGE OTHER THAN t");
          console.log("WebSocket:AUTH:OTHER:" + message);
          console.log("WebSocket:AUTH:DATA:" + data);
          tick_counter++;

          if (tick_counter > 10) {
            eventEmitter.emit('error', "too many ticks (Don't Submit too fast)",
              message_stack);
          }
        }
      }
    });
  });


  eventEmitter.on('debug1', (msg, obj) => {

    console.log("DEBUGGING: " + msg);

    if (obj) {
      console.log(obj);
    }
  });


  eventEmitter.on('error', (error, object) => {
    console.error("error: " + error);
    vscode.window.showErrorMessage(error + ' - url: ' + config.url);
    if (object) {
      vscode.window.showErrorMessage(object);
      console.error(object);
    }

    var ws1 = cookies['websocket'];
    if (ws1) {
      eventEmitter.emit('debug', "connection status is " + ws1.readyState);
      /**
       * CONNECTING 	0 	The connection is not yet open.
          OPEN 	1 	The connection is open and ready to communicate.
          CLOSING 	2 	The connection is in the process of closing.
          CLOSED 	3 	The connection is closed or couldn't be opened.
       */
      // its fine to call close on a closed connection
      ws1.close();
    }

  });


}