'use strict';

const Wit = require('./witApi.js');
const FB = require('./facebook.js');
const Config = require('./const.js');
const Helper = require('./helper.js');
const Bot_Questions = require('./bot_questions.js');

const firstEntityValue = (entities, entity) =>
{
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity].map(function(a){ return a.value});
  if (!val) {
    return null;
  }
  return val;
};

// Bot actions
const actions = {
  say(sessionId, context, message, type, cb)//this function is used
  {
    //console.log(JSON.stringify(message, null, 2));
    // Bot testing mode, run cb() and return
    if (require.main === module)
    {
      cb();
      return;
    }
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to from context
    // TODO: need to get Facebook user name
    const recipientId = context._fbid_;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      FB.fbMessage(recipientId, message, type, (err, data) => {
        if (err) {
          console.log(
            'Oops! An error occurred while forwarding the response to',
            recipientId,
            ':',
            err
          );
        }
        // Let's give the wheel back to our bot
        cb();
      });
    } else {
      console.log('Oops! Couldn\'t find user in context:', context);
      // Giving the wheel back to our bot
      cb();
    }
  },
  merge(sessionId, context, entities, cb)
  {
    let entity_keys = Object.keys(entities);
    for(let i in entity_keys)
    {
      let entity_name = entity_keys[i];
      // Retrieve the location entity and store it into a context field
      let entity_value = firstEntityValue(entities, entity_name);
      if (entity_value)
      {
        if(!context.hasOwnProperty(entity_name) || entity_name=="number" || entity_name=="price" || entity_name=="data" || entity_name=="'4g/3g data" || entity_name=="talktime" || entity_name=="local" || entity_name=="std" || entity_name=="units")
        {
          context[entity_name] = entity_value;
        }
        else
        {
          let added_values = entity_value.filter(function(val)
          {
            return context[entity_name].indexOf(val)==-1;
          });
          console.log("Added entities : ", added_values, entity_value)
          context[entity_name] = context[entity_name].concat(added_values);
        }
      }

      if(entity_name=="price")
      {
        context["attribute_question"] = true;
        if(!context.hasOwnProperty("attribute_context"))
        {
          context["attribute_context"] = {};
        }
        if(!context.hasOwnProperty("attribute"))
        {
          context["attribute"] = [];
        }
        if(context["attribute"].indexOf("price")==-1)
          context["attribute"].push("price");
        context["attribute_context"]["price"] = false;
        delete context["starting_price"];
        delete context["ending_price"];
      }
      if(entity_name=="data" || entity_name=="'4g/3g data")
      {
        context["attribute_question"] = true;
        try{
          context["4g/3g data"] = context["data"];
        }catch(e){}
        if(!context.hasOwnProperty("attribute"))
        {
          context["attribute"] = [];
        }
        if(context["attribute"].indexOf("4g/3g data")==-1)
          context["attribute"].push("4g/3g data");
        if(!context.hasOwnProperty("attribute_context"))
        {
          context["attribute_context"] = {};
        }
        context["attribute_context"]["4g/3g data"] = false;
        delete context["starting_data"];
        delete context["ending_data"];
      }
      if(entity_name=="talktime")
      {
        context["attribute_question"] = true;
        if(!context.hasOwnProperty("attribute"))
        {
          context["attribute"] = [];
        }
        if(context["attribute"].indexOf("local")==-1)
        {
          context["attribute"].push("local");
        }
        if(context["attribute"].indexOf("std")==-1)
        {
          context["attribute"].push("std");
        }
        if(!context.hasOwnProperty("attribute_context"))
        {
          context["attribute_context"] = {};
        }
        context["local"] = context["talktime"];
        context["std"] = context["talktime"];
        context["attribute_context"]["local"] = false;
        context["attribute_context"]["std"] = false;

        delete context["starting_local_minutes"];
        delete context["ending_local_minutes"];
      }
      if(entity_name=="intent")
      {
        for(let j in entity_value)
        {
          let value = entity_value[j];
          context[value] = true;
        }
      }
      if(entity_name=="attribute" && context.hasOwnProperty("attribute_context"))
      {
        console.log("Attribute Context : ", context["attribute_context"], entity_value)
        for(let j in entity_value)
        {
          context["attribute_context"][entity_value[j]] = true;
        }
        console.log(context["attribute_context"]);
      }
      if(entity_name=="adjective")
      {
        for(let j in entity_value)
        {
          context[entity_value[j]] = true;
        }
      }
    }
    cb(context);
  },
  greet(sessionId, context, cb)
  {
    delete context["greet"];
    let messages =[];
    let greet_message = Bot_Questions.greetMessage();
    messages.push(greet_message);
    actions['ask-phone-number'](sessionId, context, function(phone_number_message){
      messages = messages.concat(phone_number_message);
      cb(messages);
    });
  },
  getStarted: function(sessionId, context, cb)
  {
    let messages =[];
    let greet_message = Bot_Questions.greetMessage();
    messages.push(greet_message);
    actions['ask-phone-number'](sessionId, context, function(phone_number_message){
      messages = messages.concat(phone_number_message);
      cb(messages);
    });
  },
  processNumber(sessionId, context, cb)
  {
    let messages = [];
    var number = context["number"].concat();
    delete context["number"];
    if(context.hasOwnProperty("otp_value"))
    {
      console.log("Check OTP");
      messages = processOTP(sessionId, context, number);
      cb(messages);
    }
    else if(context.hasOwnProperty("units"))
    {
      messages = processUnits(sessionId, context, number, context["units"][0]);
      actions['processAttributeValues'](sessionId, context, function(attribute_messages)
      {
        messages = messages.concat(attribute_messages);
        cb(messages);
      });
    }
    else if(!context.hasOwnProperty("mobile_number"))
    {
      var number_in_string = null;
      try
      {
         number_in_string = number.toString();
      }catch(e){}
      if(number_in_string.length!=10 || isNaN(number))
      {
        delete context["number"];
        let invalid_number = Bot_Questions.invalidNumberMessage();
        messages.push(invalid_number);
      }
      else
      {
        context["otp_value"] = "1234";
        console.log(context["otp_value"]);
        context["mobile_number"] = number[0];
        let valid_number = Bot_Questions.validNumberMessage();
        messages.push(valid_number);
      }
      cb(messages);
    }
    else
    {
      let sorry_message = Bot_Questions.textMessages("Sorry, I didn't get that. I can only help you with postpaid plans. For any other queries kindly call 121");
      messages.push(sorry_message);
      sendMessages(sessionId, context, messages);
    }
  },
  processUnlimited(sessionId, context, cb)
  {
    let messages = [];
    var number = context["unlimited"].concat();
    delete context["unlimited"];
    delete context["number"];
    if(context.hasOwnProperty("units"))
    {
      messages = processUnits(sessionId, context, number, context["units"][0]);
      actions['processAttributeValues'](sessionId, context, function(attribute_messages)
      {
        messages = messages.concat(attribute_messages);
        cb(messages);
      });
    }
  },
  processBinaryValues(sessionId, context, cb)
  {
    let messages = [];
    let binary = context["binary"].concat();
    delete context["binary"];
    let selected_value = binary[0];
    console.log("Selected Value : ",selected_value )
    if(context["previous_function"]=="suggestPlans" || context["previous_function"]=="checkSelectedPlan")
    {
      context["previous_function"] = "processBinaryValues";
      if(selected_value=="yes")
      {
        actions["confirmed-plan"](sessionId, context, function(confirm_plan_info){
          messages = messages.concat(confirm_plan_info);
          cb(messages)
        });
      }
      else
      {
        actions["ask-user-requirements"](sessionId, context, function(ask_user_info){
          messages = messages.concat(ask_user_info);
          cb(messages)
        });
      }
    }
    else if(context["previous_function"]=="sendingPlans")
    {
      context["previous_function"] = "processBinaryValues";
      if(selected_value=="yes")
      {
        actions["check-given-plans"](sessionId, context, function(confirm_plan_info){
          messages = messages.concat(confirm_plan_info);
          cb(messages)
        });
      }
      else
      {
        actions["ask-user-requirements"](sessionId, context, function(ask_user_info){
          messages = messages.concat(ask_user_info);
          cb(messages)
        });
      }
    }
  },
  processPlanWithAdjective(sessionId, context, cb)
  {
    let messages = [];
    let adjective_value = context["adjective"][0];
    delete context["suggest_plan"];
    delete context["adjective"];

    Helper.getPlanWithAdjective(sessionId, context, adjective_value, function(cheapest_plan_details_message){
      messages = messages.concat(cheapest_plan_details_message);
      cb(messages);
    });
  },
  processPriceMessage(sessionId, context, cb)
  {
    delete context["intent"];
    delete context["suggest_plan"];

    context["attribute_context"]["price"] = false;
    let numbers = context["price"];
    numbers = numbers.sort(function(a,b){return a-b;})
    let messages = processUnits(sessionId, context, numbers, "rupees");
    actions.processAttributeValues(sessionId, context, function(attribute_context){
      messages = messages.concat(attribute_context)
      cb(messages);
    });
  },
  processDataMessage(sessionId, context, cb)
  {
    delete context["intent"];
    delete context["suggest_plan"];
    context["attribute_context"]["4g/3g data"] = false;
    let numbers = context["data"];
    let units = "GB";
    if(context["units"] && context["units"].indexOf("MB")!=-1)
      units = "MB";

    let messages = processUnits(sessionId, context, numbers, units);
    actions.processAttributeValues(sessionId, context, function(attribute_context){
      messages = messages.concat(attribute_context)
      cb(messages);
    });
  },
  processLocalMinutesMessage(sessionId, context, cb)
  {
    delete context["intent"];
    delete context["suggest_plan"];
    context["attribute_context"]["local"] = false;
    context["attribute_context"]["std"] = false;
    let numbers = context["talktime"];
    let messages = processUnits(sessionId, context, numbers, "minutes");
    actions.processAttributeValues(sessionId, context, function(attribute_context){
      messages = messages.concat(attribute_context)
      cb(messages);
    });
  },
  processPriceDataMessage(sessionId, context, cb)
  {
    delete context["intent"];
    delete context["suggest_plan"];
    let price = context["price"];
    let data = context["4g/3g data"];
    let units = "GB";
    if(context["units"] && context["units"].indexOf("MB")!=-1)
      units = "MB";
    let messages = processUnits(sessionId, context, price, "rupees");
    messages = messages.concat(processUnits(sessionId, context, data, units));
    actions.processAttributeValues(sessionId, context, function(attribute_messages){
      messages = messages.concat(attribute_messages)
      cb(messages);
    });
  },
  processPriceLocalMinutesMessage(sessionId, context, cb)
  {
    delete context["intent"];
    delete context["suggest_plan"];
    let price = context["price"];
    let local_minutes = context["talktime"];
    let messages = processUnits(sessionId, context, price, "rupees");
    messages = messages.concat(processUnits(sessionId, context, local_minutes, "minutes"));
    actions.processAttributeValues(sessionId, context, function(attribute_messages){
      messages = messages.concat(attribute_messages)
      cb(messages);
    });
  },
  processDataLocalMinutes(sessionId, context, cb)
  {
    delete context["intent"];
    delete context["suggest_plan"];
    let data = context["4g/3g data"];
    let local_minutes = context["talktime"];
    let units = "GB";
    if(context["units"] && context["units"].indexOf("MB")!=-1)
      units = "MB";

    let messages = processUnits(sessionId, context, data, units);
    messages = messages.concat(processUnits(sessionId, context, local_minutes, "minutes"));
    actions.processAttributeValues(sessionId, context, function(attribute_messages){
      messages = messages.concat(attribute_messages)
      cb(messages);
    });
  },
  suggestPlans(sessionId, context, cb)
  {
    let messages = [
      {
        "text": "One of our best selling postpaid plans:"
      }
    ];
    delete context["current_plans"];
    delete context["suggest_plan"];
    delete context["intent"];
    delete context["number"];
    delete context["otp_value"]
    context["previous_function"] = "suggestPlans";

    Helper.getBestPlan(context, function(plans_info_messages)
    {
      messages = messages.concat(plans_info_messages);
      let ask_plans_status = Bot_Questions.askPlanStatusQuestion();
      messages.push(ask_plans_status);
      cb(messages);
    });
  },
  extractAttributeFunction(sessionId, context, cb)
  {
    delete context["attribute_question"];
    let attributes = context["attribute"];
    let attribute_context = {};
    for(let i in attributes)
    {
      if(attributes[i]=="std" || attributes[i]=="local" || attributes[i]=="price" || attributes[i]=="4g/3g data")
      {
        attribute_context["required_attributes_for_process"] = true;
      }
      if(!attribute_context.hasOwnProperty(attributes[i]) && attributes[i]!="plan name")
      {
        attribute_context[attributes[i]] = true;
      } 
    }
    if(!context.hasOwnProperty("attribute_context"))
      context["attribute_context"] = attribute_context;

    if(context["previous_function"]=="no-plans-in-attribute")
    {
      if(!context["attribute_context"]['price'])
      {
        delete context["price"];
        delete context["attribute_context"]["price"];
        delete context["starting_price"];
        delete context["ending_price"];
      }
      if(!context['attribute_context']["std"] || !context["attribute_context"]["local"])
      {
        delete context["std"];
        delete context["local"];
        delete context["talktime"];
        delete context["attribute_context"]["local"];
        delete context["attribute_context"]["std"];
        delete context["starting_local_minutes"];
        delete context["ending_local_minutes"];
      }
      if(!context["attribute_context"]["4g/3g data"])
      {
        delete context["4g/3g data"];
        delete context["data"];
        delete context["attribute_context"]["4g/3g data"];
        delete context["starting_data"];
        delete context["ending_data"];
      }
    }
    context["previous_function"] = "extractAttributeFunction";
    let bot_function = Helper.getFunctionName(attribute_context, Helper.functionAttributeMap);
    console.log("Bot Function Name : ", bot_function);
    if(bot_function)
    {
      actions[bot_function](sessionId, context, function(messages)
      {
        cb(messages);
      });
    }
  },
  processAttributeValues(sessionId, context, cb)
  {
    let attribute_context = context["attribute_context"];
    console.log(attribute_context);
    delete attribute_context["plan name"];
    if(attribute_context.hasOwnProperty("price") && attribute_context["price"])
    {
      actions['priceAttribute'](sessionId, context, function(messages){
        cb(messages);
      });
    }
    else if(attribute_context.hasOwnProperty("4g/3g data")  && attribute_context["4g/3g data"])
    {
      actions['dataAttribute'](sessionId, context, function(messages){
        cb(messages);
      });
    }
    else if((attribute_context.hasOwnProperty("local") || attribute_context.hasOwnProperty("std"))  && (attribute_context["std"] || attribute_context["local"]))
    {
      actions['localStdMinutesAttribute'](sessionId, context, function(messages){
        cb(messages);
      });
    }
    else
    {
      let messages = [];
      Helper.getRequirePlans(sessionId, context, function(plans_info){
        messages = messages.concat(plans_info);
        cb(messages);
      });
    }
  },
  processUserDetails(sessionId, context, cb)
  {
    processPreviousQuestion(sessionId, context, function(messages)
    {
      cb(messages);
    });
  },
  destroyEverything(sessionId, context, cb)
  {
    console.log(context);
    context = Helper.removeContextKeys(context);
    console.log("After Reset =================")
    console.log(context);
    let messages =[];
    let reset_message = Bot_Questions.resetMessage();
    messages.push(reset_message);
    let airtel_plans_info = Bot_Questions.airtelPlansInfo();
    messages.push(airtel_plans_info);
    cb(messages);
  },
  processAllMessage(sessionId, context, cb)
  {
    delete context["all"];

    processPreviousQuestion(sessionId, context, function(messages)
    {
      cb(messages);
    });
  },
  changeAttributeRequirements(sessionId, context, cb)
  {
    delete context["change_parameter"];
    delete context["intent"];
    actions.extractAttributeFunction(sessionId, context, function(messages){
      cb(messages);
    });
  },
  checkSelectedPlan: function(sessionId, context, cb)
  {
    let messages = [];
    let price = context["price"][0];
    let plan_name = context["postpaid_plan_type"][0];
    context["previous_function"] = "checkSelectedPlan";
    Helper.getSelectedPlanDetails(price, plan_name, function(plan_details){
      if(plan_details.length>0)
      {
        context["current_plans"] = [plan_details[0]["id"]];
        delete context["postpaid_plan_type"];
        delete context["intent"];
        delete context["suggest_plan"];
        console.log(plan_details);
        let plans_info = Bot_Questions.bestPlanInfoMessage(plan_details[0]);
        let ask_plans_status = Bot_Questions.askSelectedPlanStatusQuestion();
        messages.push(plans_info);
        messages.push(ask_plans_status);
        cb(messages);
      }
      else
      {
        let selected_plan = price +" - "+ plan_name;
        context = Helper.removeContextKeys(context);
        let no_plan_found_message = Bot_Questions.noPlanFoundMessage(selected_plan);
        messages.push(no_plan_found_message);
        cb(messages);
      }
    });
  },
  ['ask-phone-number']: function(sessionId, context, cb)
  {
    let messages = [];
    let context_keys = Object.keys(context);
    for(let i in context_keys)
    {
      if(context_keys[i]!="_fbid_" && context_keys[i]!="mobile_number" && context_keys[i]!="user_name" && context_keys[i]!="otp_value")
      {
        delete context[context_keys[i]];
      }
    }
    let ask_phone_number = Bot_Questions.askPhoneNumberMessage(false);
    if(context.hasOwnProperty("otp_value")) // if otp is exists, user already given the phone number
    {
      delete context["otp_value"];
      ask_phone_number = Bot_Questions.askPhoneNumberMessage(true);
    }
    if(!context.hasOwnProperty("mobile_number"))
    {
      messages.push(ask_phone_number);
    }
    else
    {
      context = Helper.removeContextKeys(context);
      let airtel_plans_info = Bot_Questions.airtelPlansInfo();
      messages.push(airtel_plans_info);
    }
    cb(messages);
  },
  ['confirmed-plan']: function(sessionId, context, cb)
  {
    let messages = [];
    if(!context.hasOwnProperty("user_name") && context["previous_function"]!="ask-user-name")
    {
      context["previous_function"] = "ask-user-name";
      context["asked_user_details"] = true;
      let ask_name = Bot_Questions.askNameMessage();
      messages.push(ask_name);
      cb(messages);
    }
    else
    {
      let selected_plan_id = context["current_plans"][0];
      Helper.getPlanDetails(selected_plan_id, function(plan_details){
        let plan_name = plan_details["price"]+" - "+plan_details["plan_name"];
        let msg = Bot_Questions.planConfirmedMessage(context["user_name"],plan_name);
        messages.push(msg);
        let plan_details_message = Bot_Questions.planDetailsMessage(plan_details);
        messages.push(plan_details_message);

        context = Helper.removeContextKeys(context);
        cb(messages);
      });
    }
  },
  ['ask-user-requirements']: function(sessionId, context, cb)
  {
    console.log("Ask User requirements");
    context["previous_function"] = "ask-user-requirements";
    let messages = [];
    let msg = Bot_Questions.userRequirementQuestion();
    messages.push(msg);
    cb(messages);
  },
  ["check-given-plans"]: function(sessionId, context, cb)
  {
    let messages = [];
    let current_plans = context["current_plans"];
    context["previous_function"] = "check-given-plans";
    console.log("Current plans : ",current_plans)
    if(current_plans.length!=1)
    {
      Helper.getCurrentPlans(current_plans, function(current_plans_details){
        let having_more_plans_message = Bot_Questions.havingMorePlansMessage(current_plans_details);
        messages.push(having_more_plans_message);
        cb(messages);
      });
    }
    else
    {
      Helper.getCurrentPlans(current_plans, function(current_plan_details){
        actions['confirmed-plan'](sessionId, context, function(next_message){
          messages = messages.concat(next_message);
          cb(messages);
        });
      });
    }
  },
  ['resend-otp']: function(sessionId, context, cb)
  {
    console.log("Resending the OTP");
    let messages = [];
    cb(messages);
  },
  ['priceAttribute']: function(sessionId, context, cb)
  {
    let attribute = context["attribute"];
    let attribute_context = context["attribute_context"];
    context["units"] = ["rupees"];
    let messages = [];
    let price_msg = Bot_Questions.priceRequirementQuestion();
    messages.push(price_msg);
    cb(messages);
  },
  ['dataAttribute']: function(sessionId, context, cb)
  {
    let attribute = context["attribute"];
    let attribute_context = context["attribute_context"];
    context["units"] = ["GB"];
    let messages = [];
    let data_msg = Bot_Questions.dataRequirementQuestion();
    messages.push(data_msg);
    cb(messages);
  },
  ['localStdMinutesAttribute']: function(sessionId, context, cb)
  {
    let attribute = context["attribute"];
    let attribute_context = context["attribute_context"];
    context["units"] = ["minutes"];
    let messages = [];
    let local_std_msg = Bot_Questions.localStdMinutesRequirementQuestion();
    messages.push(local_std_msg);
    cb(messages);
  }
};

function processingEntities(sessionId, context, entities)
{
  console.log("Entities : ");
  console.log(JSON.stringify(entities, null, 2));
  
  
  
  if(Object.keys(entities).length==1 && entities.hasOwnProperty("intent"))
  {
    delete entities["intent"];
  }
  if(Object.keys(entities).length==0 && context["previous_function"]!="ask-user-name")
  {
    let sorry_message = Bot_Questions.textMessages("Sorry, I didn't get that. I can only help you with postpaid plans. For any other queries kindly call 121");
    sendMessages(sessionId, context, [sorry_message]);
    if(context["previous_function"]=="ask-user-requirements")
    {
      actions["ask-user-requirements"](sessionId, context, function(messages){
        sendMessages(sessionId, context, messages);
      });
      return;
    }
  }
  else if(context["previous_function"]=="ask-user-name")
  {
    context["user_name"] = context["message"];
    actions["confirmed-plan"](sessionId, context, function(messages){
      sendMessages(sessionId, context, messages);
    });
    return;
  }
  actions.merge(sessionId, context, entities, function(user_context)
  {
    console.log(JSON.stringify(user_context, null, 2));
    //find the require function from context
    let bot_function = Helper.getFunctionName(user_context, Helper.functionContextMap);
    console.log("Bot function: ", bot_function);
    if(bot_function)
    {
      actions[bot_function](sessionId, user_context, function(messages)
      {
        sendMessages(sessionId, user_context, messages);
      });
    }
    else if(!user_context.hasOwnProperty("mobile_number"))
    {
      actions["ask-phone-number"](sessionId, user_context, function(messages){
        sendMessages(sessionId, user_context, messages);
      });
    }
  });
}
function processUserSelectedMessage(sessionId, context, selected_msg_belongs)
{
  console.log("Next Function : ", selected_msg_belongs);
  actions[selected_msg_belongs](sessionId, context, function(messages){
    sendMessages(sessionId, context, messages);
  });
}
/*
* this function is used to process the user given otp value
* @params {string} sessionId
* @params {obj} context
* @params {integer} number
*/
function processOTP(sessionId, context, number)
{
  let messages = [];
  if(number[0]==context["otp_value"])
  {
    delete context["number"];
    delete context["otp_value"];
    let success_message = Bot_Questions.successMessage();
    messages.push(success_message);
    let airtel_plans_info = Bot_Questions.airtelPlansInfo();
    messages.push(airtel_plans_info);
  }
  else
  {
    let invalid_otp_message = Bot_Questions.invalidOtpMessage();
    messages.push(invalid_otp_message);
  }
  return messages;
}
function processUnits(sessionId, context, numbers, units)
{
  console.log(numbers, units);
  let messages = [];
  if(numbers.indexOf("unlimited")!=-1)
  {
    if(units=="GB" || units=="MB")
      numbers[numbers.indexOf("unlimited")] = 999999999999999;
    if(units=="minutes")
      numbers[numbers.indexOf("unlimited")] = 200000;
  }
  numbers = numbers.sort(function(a,b){return a-b;});
  if(units=="rupees")
  {
    context["price"] = numbers;
    context["attribute_context"]["price"] = false;
    if(numbers.length>1)
    {
      context["starting_price"] = numbers[0];
      context["ending_price"] = numbers[1];
    }
    else
    {
      context["starting_price"] = undefined;
      context["ending_price"] = numbers[0];
    }  
  }
  else if(units=="GB" || units=="MB")
  {
    if(units=="MB")
      numbers = numbers.map(function(a){ return a/1024; })
    context["4g/3g data"] = numbers;
    context["attribute_context"]["4g/3g data"] = false;
    if(numbers.length>1)
    {
      context["starting_data"] = numbers[0];
      context["ending_data"] = numbers[1];
    }
    else
    {
      context["starting_data"] = numbers[0];
      context["ending_data"] = undefined;
    }
  }
  else if(units=="minutes")
  {
    context["local"] = numbers;
    context["std"] = numbers;
    context["attribute_context"]["std"] = false;
    context["attribute_context"]["local"] = false;
    if(numbers.length>1)
    {
      context["starting_local_minutes"] = numbers[0];
      context["ending_local_minutes"] = numbers[1];
    }
    else
    {
      context["starting_local_minutes"] = numbers[0];
      context["ending_local_minutes"] = undefined;
    }
  }
  return messages;
}
function processPreviousQuestion(sessionId, context, cb)
{
  if(context["previous_function"])
  {
    let messages = [];
    if(context["previous_function"]=="ask-user-requirements")
    {
      context["attribute"] = ["4g/3g data", "price", "local", "std"];
      delete context["attribute_context"];
      actions.extractAttributeFunction(sessionId, context, function(messages){
        cb(messages)
      });
    }
  }
}
function sendMessages(sessionId, context, messages)
{
  if(messages.length>0)
    getMessage(messages, 0);
  function getMessage(messages, index)
  {
    let message = messages[index];
    actions.say(sessionId, context, message, "message", function()
    {
      index++;
      if(index<messages.length)
        getMessage(messages, index);
    });
  }
}

module.exports = {
  actions : actions,
  processingEntities: processingEntities,
  processUserSelectedMessage: processUserSelectedMessage,
  sendMessages: sendMessages
};

//testing purpose
if(require.main === module)
{
  console.log("Bot testing mode.");
  var stdin = process.openStdin();
  stdin.addListener("data", function(msg) {
      msg = msg.toString().trim();
      let sessionId = "tarak";
      let context = {};
      Wit.witMessageAPI(msg, undefined, function(entities)
      {
        processingEntities(sessionId, context, entities);
      });
  });
}