'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
const bodyParser = require('body-parser');
const express = require('express');
const ElasticSearch = require('./elastic_search.js');
// get Bot, const, and Facebook API
const bot = require('./bot.js');
const Config = require('./const.js');
const FB = require('./facebook.js');
const Helper = require('./helper.js');
const Bot_Questions = require('./bot_questions.js');
// Setting up our bot
const wit = require("./witApi.js");

// Webserver parameter
const PORT = process.env.PORT || 1212;

// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {
      fbid: fbid,
      context: {
        _fbid_: fbid
      }
    }; // set context, _fid_
  }
  return sessionId;
};

// Starting our webserver and putting it all together
const app = express();
app.set('port', PORT);
app.listen(app.get('port'));
app.use(bodyParser.json());
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
});
console.log("I'm wating for you @" + PORT);

// index. Let's say something fun
app.get('/airtel_bot/', function(req, res) {
  res.send('"Checking the Airtel bot"');
});

// Webhook verify setup using FB_VERIFY_TOKEN
app.get('/airtel_bot/webhook/', (req, res) => {
  console.log("In get")
  if (!Config.FB_VERIFY_TOKEN) {
    throw new Error('missing FB_VERIFY_TOKEN');
  }

  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === Config.FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

// The main message handler
app.post('/airtel_bot/webhook', (req, res) => {
  console.log("In POST Webhook");
  let body = req.body;
  //console.log(JSON.stringify(body, null, 2));
  // Parsing the Messenger API response
  const messaging = FB.getFirstMessagingEntry(body);
  if (messaging) {
    console.log("Got message");
    // Yay! We got a new message!
    // We retrieve the Facebook user ID of the sender
    const sender = messaging.sender.id;
    // We retrieve the user's current session, or create one if it doesn't exist
    // This is needed for our bot to figure out the conversation history
    const sessionId = findOrCreateSession(sender);
    let context = sessions[sessionId].context;
    if(sessionId)
    {
      bot.actions.say(sessionId, context, "typing_on", "sender_action", function(){});
    }
    //console.log(JSON.stringify(context, null, 2));
    if(messaging.message)
    {
      //console.log("MESSAGE : ", messaging);
      // We retrieve the message content
      const atts = messaging.message.attachments;
      let msg = messaging.message.text;
      let quick_reply_status = true;
      if(messaging.message.hasOwnProperty("quick_reply"))
      {
        let quick_reply = messaging.message.quick_reply;
        msg = quick_reply.payload;
        quick_reply_status = false;
      }
      if(quick_reply_status)
      {
        if(context["previous_function"]=="ask-user-requirements")
        {
          msg = "change "+msg;
        }
      }
      if (atts)
      {
        // We received an attachment
        // Let's reply with an automatic message
        bot.sendMessages(sessionId,context,[{text:'Sorry I can only process text messages for now.'}]);
      } else if (msg)
      {
        msg = msg.toLowerCase();
        String.prototype.splice = function(idx, rem, str) {
            return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
        };
        let numbers = msg.match(/[-]{0,1}[\d.]*[\d]+/g);
        for(let i in numbers)
        {
          let number_index = msg.indexOf(numbers[i]);
          let next_index = number_index+1;
          if(next_index<msg.length)
          {
            if(msg[next_index]=="g")
            {
              if(next_index+1!=msg.length && msg[next_index+1]==" ")
              {
                msg = msg.split(numbers[i]+"g").join("");
                continue;
              }
              if(next_index+1==msg.length)
              {
                msg = msg.split(numbers[i]+"g").join("");
                continue;
              }
            }
          }
          msg = msg.splice(number_index, numbers[i].length, numbers[i]+" ");
        }
        // We received a text message
        console.log("Fb User message : ", msg);
        
        context["message"] = msg;
        // Let's forward the message to the Wit.ai Bot Engine
        // This will run all actions until our bot has nothing left to do
        wit.witMessageAPI(msg, undefined, function(entities)
        {
          bot.processingEntities(sessionId, context, entities);
        });
      }
    }
    else if(messaging.postback)
    {
      console.log("Got Postback message from fb");
      // This is need to figure out the next bot action
      const user_selected_msg_belongs = messaging.postback.payload;
      bot.processUserSelectedMessage(sessionId, context, user_selected_msg_belongs);
    }
  }
  res.sendStatus(200);
});
app.get('/airtel_bot/plans', (req, res) => {
  let body = req.query;
  console.log(body);
  let plan_id = body.plan_id

  let query = {
    index : "airtel",
    body: {
      query: {
        match_phrase:{"_id":plan_id}
      }
    }
  };
  ElasticSearch.runQuery(query, function(response, total, err)
  {
    let source = {};
    if(!err && total>0)
    {
      source = response[0]["_source"];
    }
    console.log(JSON.stringify(source, null, 2))
    res.render('plans',{"source":JSON.stringify(source)});
  });
});
app.get('/airtel_bot/customize', (req, res) => {
  let body = req.query;
  console.log(body);
  let price_data = body.price;
  let user_id = body.user_id;
  let query = {
    index : "airtel",
    body: {
      query: 
      {
        bool:{
          must:[
            {
              match_phrase:{"price":price_data}
            },
            {
              match_phrase:{"plan_name":"myplan"}
            }
          ]
        }
      },
      sort:[{"4g_3g_data":"asc"}]
    },
    size: 100
  };
  ElasticSearch.runQuery(query, function(response, total, err)
  {
    let source = [];
    if(!err && total>0)
    {
      for(let i in response)
      {
        let response_source = response[i]["_source"];
        response_source["id"] = response[i]["_id"];
        let obj = {
          price:response_source["price"],
          plan_name: response_source["plan_name"],
          data : response_source["4g_3g_data"],
          local_min: response_source["local_std_calls"],
          default_status: response_source["type"]=="default",
          plan_id : response_source["id"],
          user_id : user_id
        };
        source.push(obj);
      }
    }
    res.render('customize',{"source":JSON.stringify(source)});
  });
});
app.post('/airtel_bot/apply-plan',(req, res)=>{
  let body = req.body;
  console.log("Applied plan");
  console.log(body);
  let sessionId = body.user_id;
  let plan_id = body.plan_id;
  let context = sessions[sessionId]["context"];
  context["current_plans"] = [plan_id];
  let messages = [];
  Helper.getPlanDetails(plan_id, function(plan_details){
    let plans_info = Bot_Questions.bestPlanInfoMessage(plan_details);
    let ask_plans_status = Bot_Questions.askPlanStatusQuestion();
    messages.push(plans_info);
    messages.push(ask_plans_status);
    bot.sendMessages(sessionId, context, messages);
    res.send({"status":true});
  });
});