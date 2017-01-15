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

exports.handler = (event, context, callback) => {

    console.log('Received event:', JSON.stringify(event, null, 2));
    var method = event.context["http-method"];
    PAGE_ACCESS_TOKEN          = event["stage-variables"]["PAGE_ACCESS_TOKEN"];
    var response = "";
    var queryparams = event.params.querystring;
    if(method === "GET")
    {

        callback(null, 'Authorized');//return the challenge
    }
    else
    {
        if(method === "POST")
        {  
            var message = event["body-json"]["message"];
            var messageText = message.text;
 
            var recipientId = 1301331826591392 // hard coded to Andrei's FB
            respond(recipientId, messageText, null, null);
        }
    }
};

var respond = function respond(recipientId, textMessage, imageUrl, itemUrl)
{
    console.log('Params: %s %s %s', textMessage, imageUrl, itemUrl);
    var messageData = {};
    messageData.recipient = {id: recipientId};
    if(imageUrl != null && textMessage != null)
    { 
        //Use generic template to send a text and image
        var element =  {
                            title : textMessage,
                            image_url : imageUrl
                            //subtitle : textMessage
                        };
        if (itemUrl != null)
            element.item_url = itemUrl;      
            
        messageData.message =  {
           
            attachment : {
                type : "template",
                payload : {
                        template_type : "generic",
                        elements : [
                            element
                        ]
                    }
                }
            };
    }
    else
    { 
        if (imageUrl != null){
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
    console.log('Sending: ' + JSON.stringify(messageData, null, 2))
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

