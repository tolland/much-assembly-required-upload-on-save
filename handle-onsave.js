//
//
//
//


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

  if (parsedurl.protocol == 'http:') {
    var http = require("http");
    parsedurl.port = parsedurl.port || 80;
  } else {
    var http = require("https");
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
                /**
                 * TODO handle login failure...
          login=Username+or+password+incorrect
          marSession=97469464777779797d724410a6dfda; path=/
              */
                console.log("COOKIE:" + cookiestr);
                if (cookiestr.startsWith('login=Username+or+password+incorrect')) {
                  eventEmitter.emit('login-error');
                } else if (cookiestr.startsWith('marSession')) {
                  cookies['marSession'] = cookiestr.split(';')[0].split('=')[1];
                  console.log("cookie is " + cookies['marSession'])
                  console.log("STATUS:" + response.statusCode);
                  eventEmitter.emit('got-cookie');
                }
              }
            );
          } else {
            eventEmitter.emit('no-cookie');
          }
        }
      );
    });

  post_req.on(
    "error",
    function (err) {
      console.error("ERROR:" + err);
      eventEmitter.emit('network-error');
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

    // Set up the request
    var parsedurl = url.parse(token_urlstring);

    // do I need to do this again??
    if (parsedurl.protocol == 'http:') {
      var http = require("http");
      parsedurl.port = parsedurl.port || 80;
    } else {
      var http = require("https");
      parsedurl.port = parsedurl.port || 443;
    }

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

        console.log("STATUS:" + response.statusCode);

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
            console.log("at end");
            cookies['ServerInfo'] = JSON.parse(data);
            console.log("token is " + cookies['ServerInfo'].token);
            console.log("STATUS:" + response.statusCode);
            console.log("  DATA:" + data);
            eventEmitter.emit('got-token');
          }
        );


      });

    token_req.on(
      "error",
      function (err) {
        console.error("ERROR:" + err);
        eventEmitter.emit('network-error');
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
    console.log("got-token- opening websocket");

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
      console.log("Open, sending token to websocket")
      ws.send(cookies['ServerInfo'].token);

      //save the websocket in the global
      cookies['websocket'] = ws;
    });

    ws.on('error', function (data) {
      console.log("error in websocket");
      console.log(data);
      eventEmitter.emit('ws-network-error');
    });

    ws.on('message', function incoming(data) {
      console.log("on message in got-token");

      var message = JSON.parse(data);

      if (message) {
        if (message.t) {
          // responds with {t: "auth", m: "ok"}
          switch (message.t) {
            case 'auth':
              if (message.m == 'ok') {
                eventEmitter.emit('send-code');
              }
              break;
            default:
              console.log("on message in got-token " + message.m);

              break;
          }
        }
      }
      console.log(data);
      console.log("message");
    });
  });

  /**
   *  process the response from the server
   */
  eventEmitter.on('send-code', () => {

    var ws = cookies['websocket'];

    fs.readFile(filepath, 'utf8', function (err, data) {
      if (err) {
        console.log(err);
        process.exit(1);
      }

      var msg = {};
      msg.t = 'uploadCode';
      msg.code = data;

      ws.send(JSON.stringify(msg));

      ws.on('message', function incoming(data) {

        var message = JSON.parse(data);

        if (message) {
          if (message.t) {
            switch (message.t) {
              case 'codeResponse':
                if (message.bytes) {
                  eventEmitter.emit('sent-code');
                }
                break;
            }
          }
        }
      });
    });
  });

  /**
   *  process the response from the server
   */
  eventEmitter.on('sent-code', () => {
    const NORMAL_CLOSE = 1000;
    var ws = cookies['websocket'];
    ws.close(NORMAL_CLOSE, 'Upload Complete');
    console.log("Closing and going away ...");

    vscode.window.setStatusBarMessage('<color=red>File</color> Uploaded - ' + vscode.window.activeTextEditor.document.uri.fsPath + ' to ' + config.url, 10000);

  });

  eventEmitter.on('no-cookie', () => {
    console.log("No cookie ...");
    vscode.window.showErrorMessage('No cookie was returned - url: ' + config.url);
  });

  eventEmitter.on('login-error', () => {
    console.log("Login error ...");
    vscode.window.showErrorMessage('Login error from server - url: ' + config.url);
  });

  eventEmitter.on('network-error', () => {
    console.log("network error ...");
    vscode.window.showErrorMessage('there was a network error - url: ' + config.url);
  });

  eventEmitter.on('ws-network-error', () => {
    console.log("websocket network error ...");
    vscode.window.showErrorMessage('there was a websocket network error - url: ' + config.url);

    console.log(cookies);
    //try and do some sort of cleanup on the websocket if it has failed
    var ws1 = cookies['websocket'];
    if (ws1) {
      console.log("connection status is " + ws1.readyState);
      ws1.close(NORMAL_CLOSE, 'Upload Complete');
    }
  });
}