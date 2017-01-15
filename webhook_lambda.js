//MQTTDemoBot
//function for the AWS FB bot lambda / API Gateway webhook implementation
//TODO bulletproof. Status code, handling for dif. kinds of messages. See app.js for how FB does it in their sample bot code
//split sender and fb webhooks into separate files

'use strict';
console.log('Loading function');
const request = require('request');
const https = require('https');
var PAGE_ACCESS_TOKEN;
var MESSENGER_VALIDATION_TOKEN;

var responses = {
    hello: {text: 'Hello'},
    help: {text: 'You can type SOUND'},
    echo: {text: 'You said:'}
};


exports.handler = (event, context, callback) => {

    console.log('Received event:', JSON.stringify(event, null, 2));
    var method = event.context["http-method"];
    PAGE_ACCESS_TOKEN          = event["stage-variables"]["PAGE_ACCESS_TOKEN"];
    var response = "";
    var queryparams = event.params.querystring;
    if(method === "GET")
    {

       if(queryparams['hub.mode'] === 'subscribe' && 
          queryparams['hub.verify_token'] === MESSENGER_VALIDATION_TOKEN){
          response = queryparams['hub.challenge'];
        }
        else{
          response ="Incorrect verify token"
        }
        callback(null, response);//return the challenge
    }
    else
    {
        if(method === "POST")
        {  
           var messageEntries = event["body-json"].entry;
           console.log('messageEntries:', JSON.stringify(messageEntries, null, 2));
            for(var entryIndex in messageEntries)
            {
                var messageEntry = messageEntries[entryIndex].messaging;

                for(var idx in messageEntry)
                {
                    var message = messageEntry[idx];
                    //TODO
                    if(message.message !== undefined  && message.message["is_echo"] !== true )
                    {
                        
                        var messageText = message.message.text;
                        var senderID = message.sender.id;
                        var responseText;
                        var command;
                        // parse out actions
                        if (messageText && messageText.length > 0) {
                            if (messageText.match(/stop/i) != null)  {
                                responseText = 'I will tell the device to stop sending updates';
                                command = 'STOP';
                            } 
                            else if (messageText.match(/resume/i) !== null)  {
                                responseText = 'I will tell the device to resume sending updates';
                                command = 'RESUME';
                            } 
                            else if (messageText.match(/sound/i) !== null)  {
                                responseText = 'I will tell the device to play sound';
                                command = 'SOUND';
                            } 
                            else if (messageText.match(/location/i) !== null)  {
                                responseText = 'I will tell the device to report location';
                                command = 'LOCATION';
                            } 
                            else {
                                responseText = "Not sure what you want to do: Try STOP, RESUME, SOUND, LOCATION"
                            }
                            var did = '234389908509';
                            if (command != null) {    
                                sendToDevice({did: did, command: command}, event["stage-variables"]["DEVICE_PUBLISHER_URL"]);
                            }
                            respond(senderID, responseText, null);
                        }
                    
                    }
                }
            }
        }     
            
    }
};


var respond = function (recipientId, textMessage, imageUrl) {
    
    var messageData = {};
    messageData.recipient = {id: recipientId};
    if(imageUrl !== null && textMessage !== null)
    { 
        //Use generic template to send a text and image
        messageData.message =  {
            attachment : {
                type : "template",
                payload : {
                        template_type : "generic",
                        elements : [{
                            title : textMessage,
                            image_url : imageUrl,
                            subtitle : textMessage
                        }]
                    }
                }
            };
    }
    else
    { 
        if (imageUrl !== null){
            //Send a picture
            
            messageData.message = {
                attachment : {
                    type : "image",
                    payload : {
                        url : imageUrl
                    }
                }
            };
        }
        else
        {
            //send a text message
             messageData.message = {
                 text : textMessage
             };
        }
    }
    request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Message %s delivered to recipient %s", messageId, recipientId);
      } else {
      console.log("Message sent to recipient %s", recipientId);
      }
    } else {
      console.error(response.error);
      console.log("Facebook Request failed    : " + JSON.stringify(response));
      console.log("Message Data that was sent : " + JSON.stringify(messageData));
    }
       
  });  
}

function sendToDevice(messageData, uri) {
  request({
    uri: uri, 
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    //TODO proper error handling
    if (!error && response.statusCode == 200) {
      
      console.log("Successfully called Device Send API");
      
    } else {
      console.error("Failed calling Device API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}
// var event = {
//     "body-json": {
//         "object": "page",
//         "entry": [
//             {
//                 "id": "345231899177159",
//                 "time": 1484289945807,
//                 "messaging": [
//                     {
//                         "sender": {
//                             "id": "1301331826591392"
//                         },
//                         "recipient": {
//                             "id": "345231899177159"
//                         },
//                         "timestamp": 1484289945774,
//                         "message": {
//                             "mid": "mid.1484289945774:bbdd1a8662",
//                             "seq": 19178,
//                             "text": "SOUND"
//                         }
//                     }
//                 ]
//             }
//         ]
//     },
//     "params": {
//         "path": {},
//         "querystring": {},
//         "header": {
//             "Accept": "*/*",
//             "Accept-Encoding": "deflate, gzip",
//             "CloudFront-Forwarded-Proto": "https",
//             "CloudFront-Is-Desktop-Viewer": "true",
//             "CloudFront-Is-Mobile-Viewer": "false",
//             "CloudFront-Is-SmartTV-Viewer": "false",
//             "CloudFront-Is-Tablet-Viewer": "false",
//             "CloudFront-Viewer-Country": "US",
//             "Content-Type": "application/json",
//             "Host": "tyc76g445d.execute-api.us-east-1.amazonaws.com",
//             "Via": "1.1 24b0e5a3429d07ef12381da50e07f70f.cloudfront.net (CloudFront)",
//             "X-Amz-Cf-Id": "zsUDqKJJy1OB0PBUuVnIZHu5a7JuMsfkaZe3st2qovhoyvgLt5Hz6Q==",
//             "X-Forwarded-For": "173.252.90.86, 54.239.134.8",
//             "X-Forwarded-Port": "443",
//             "X-Forwarded-Proto": "https",
//             "X-Hub-Signature": "sha1=966621da44e6eeec938ef787ad017bd0e452e4c2"
//         }
//     },
//     "stage-variables": {
//         "MQTT_HOST": "test.mosquitto.org",
//         "MESSENGER_VALIDATION_TOKEN": "gm7Gnv3Ndujmzc",
//         "MQTT_PORT": "1883",
//         "DEVICE_PUBLISHER_URL": "http://54.89.62.20:8080/commands",
//         "PAGE_ACCESS_TOKEN": "EAADaScVtoX8BADVrRiXlqv87dC3UjsxJhbBBe99zFZBg7JZCxvZBrXXcauZAZCu4TAvABdlPeginJj0znsJMOI4wlARRFSrXbsbOPhMnrkPW2K7tzifZAoZAnDdtBHlZBB9LAcjQbAYZBN0gEaW2doaFDXSjjwsL4aOMZB1h3yEZArEqQZDZD"
//     },
//     "context": {
//         "account-id": "",
//         "api-id": "tyc76g445d",
//         "api-key": "",
//         "authorizer-principal-id": "",
//         "caller": "",
//         "cognito-authentication-provider": "",
//         "cognito-authentication-type": "",
//         "cognito-identity-id": "",
//         "cognito-identity-pool-id": "",
//         "http-method": "POST",
//         "stage": "dev",
//         "source-ip": "173.252.90.86",
//         "user": "",
//         "user-agent": "",
//         "user-arn": "",
//         "request-id": "e98334fc-d95b-11e6-9d74-2762c49845e1",
//         "resource-id": "7ngy1f",
//         "resource-path": "/webhook"
//     }
// };
// exports.handler(event, null, null);