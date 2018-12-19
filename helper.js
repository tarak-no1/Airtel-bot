const elasticsearch = require("./elastic_search.js");
const Bot_Questions = require("./bot_questions.js");
const functionContextMap =
{
    "greet" : [['greet'],["reset","binary"]],
    "processNumber" : [['number'],['reset',"binary"]],
    "processBinaryValues" : [["binary"],["reset","all"]],
    "processUnlimited":[["unlimited"],["reset","binary"]],
    
    "processPlanWithAdjective": [["suggest_plan", "adjective"],["reset","all","binary"]],

    "suggestPlans": [['suggest_plan', "mobile_number"],["reset",,"binary", "price","4g/3g data", "local","std","number","unlimited","adjective"]],
    "extractAttributeFunction":[["attribute","mobile_number"],["reset","binary", "all", "asked_user_details","number","suggest_plan", "unlimited","adjective"]],
    "destroyEverything":[["reset"],[]],
    "processAllMessage": [["all","mobile_number"],["reset","binary","adjective"]],
    "processUserDetails": [["asked_user_details","mobile_number"],["reset","binary","adjective"]],
    "changeAttributeRequirements": [["change_parameter","intent", "attribute","mobile_number"],["reset","binary","adjective"]],
    "checkSelectedPlan": [["price","postpaid_plan_type","mobile_number"],["reset","binary","adjective"]],
    "processPriceMessage":[["price", "attribute", "attribute_context","mobile_number"],["binary","starting_price","postpaid_plan_type","reset","number","adjective"]],
    "processDataMessage":[["4g/3g data", "attribute","mobile_number"],["binary","starting_data","ending_data","postpaid_plan_type","reset","number","adjective"]],
    "processLocalMinutesMessage":[["local", "attribute", "attribute_context","mobile_number"],["binary","starting_local_minutes","ending_local_minutes","number","postpaid_plan_type","reset","adjective"]],
    "processPriceDataMessage":[["suggest_plan","price","4g/3g data","attribute","attribute_context","mobile_number"],["binary","starting_price","ending_price","number","starting_data","ending_data","postpaid_plan_type","reset","adjective"]],
    "processPriceLocalMinutesMessage":[["suggest_plan","price","local","attribute","attribute_context","mobile_number"],["binary","starting_price","ending_price","number","starting_local_minutes","ending_local_minutes","postpaid_plan_type","reset","adjective"]],
    "processDataLocalMinutes":[["suggest_plan","local","4g/3g data","attribute","attribute_context","mobile_number"],["binary","starting_local_minutes","number","ending_local_minutes","starting_data","ending_data","postpaid_plan_type","reset","adjective"]]
};

const functionAttributeMap =
{
  "suggestPlans": [['plan name'],['required_attributes_for_process']],
  "processAttributeValues":[['required_attributes_for_process'],[]]
};

function getFunctionName(object_data, functionMap)
{
  let function_keys = Object.keys(functionMap);
  // Create items array
  let items = function_keys.map(function(key) {
      return [key, functionMap[key]];
  });
  // Sort the array based on the second element length
  items = items.sort(function(first, second) {
      return second[1][0].length - first[1][0].length;
  });
  for(let i in items) {
      let flag = true;
      for(let j in items[i][1][0])
      {
        if(!object_data.hasOwnProperty(items[i][1][0][j]))
        {
            flag = false;
        }
      }
      for(let k in items[i][1][1])
      {
        if(object_data.hasOwnProperty(items[i][1][1][k]))
        {
            flag = false;
        }
      }
      if (flag) {
          return items[i][0];
      }
  }
  return null;
}
function getBestPlan(context, callback)
{
  let messages = [];
  let best_plan_query = {
    index: "airtel_test",
    body:
    {
      query:
      {
        match_phrase: {"best_plan_status":true}
      }
    }
  }
  elasticsearch.runQuery(best_plan_query, function(response, total, err)
  {
    console.log(response, total, err);
    if(!err && total>0)
    {
      let best_plan_id = response[0]["_id"];
      let best_plan_source = response[0]["_source"];
      best_plan_source["id"] = best_plan_id;
      context["current_plans"] = [best_plan_id];
      let plans_info = Bot_Questions.bestPlanInfoMessage(best_plan_source);
      messages.push(plans_info);
    }
    callback(messages)
  });
}
function getPlanDetails(id, callback)
{
  let plan_details = [];
  let best_plan_query = {
    index: "airtel_test",
    body:
    {
      query:
      {
        match_phrase: {"_id":id}
      }
    }
  };
  getElasticDataSync(best_plan_query,"hits", function(source){
    if(source.length>0)
    {
      plan_details = source[0]["_source"];
      plan_details["id"] = source[0]["_id"];
    }
    callback(plan_details);
  });
}
function getRequirePlans(sessionId, context, callback)
{
  let messages = [];
  let plans_obj = {};
  let plans_query = buildQuery(context);
  console.log("************************** Build query **************************");
  console.log(JSON.stringify(plans_query, null, 2));
  getElasticDataSync(plans_query, "hits", function(source){
    context["current_plans"] = [];
    let price_status = false;
    if(context["attribute_context"].hasOwnProperty("price"))
    {
      price_status = true;
      source=source.sort(function(a,b){return b["_source"]["price"]-a["_source"]["price"];});
    }
    if(context["attribute_context"].hasOwnProperty("local") || context["attribute_context"].hasOwnProperty("std"))
    {
      price_status=false;
      source=source.sort(function(a,b){return a["_source"]["local_std_calls"]-b["_source"]["local_std_calls"];});
    }
    if(context["attribute_context"].hasOwnProperty("4g/3g data"))
    {
      price_status =false;
      source=source.sort(function(a,b){return a["_source"]["4g_3g_data"]-b["_source"]["4g_3g_data"];});
    }
    if(price_status)
    {
      for(let i in source)
      {
        let data_id = source[i]["_id"];
        let data_source = source[i]["_source"];
        data_source["id"] = data_id;
        let plan_name = data_source["plan_name"];
        if(!plans_obj.hasOwnProperty(plan_name) && data_source["type"]=="default")
        {
          if(plan_name=="myplan" || plan_name=="myplan_infinity")
          {
            context["current_plans"].push(data_id);
            plans_obj[plan_name] = data_source;
          }
        }
      }
    }
    else
    {
      let myplans = source.filter(function(a){return a["_source"]["plan_name"]=="myplan";});
      let myplans_infinity = source.filter(function(a){return a["_source"]["plan_name"]=="myplan_infinity";});


      let myplan_min_price = 100000000000000;
      let myplan_infinity_min_price = 100000000000000;

      if(myplans.length>0)
      {
        myplan_min_price= myplans[0]["_source"]["price"];
      }
      if(myplans_infinity.length>0)
      {
        myplan_infinity_min_price= myplans_infinity[0]["_source"]["price"];
      }

      source=source.filter(function(a){
        return (a["_source"]["plan_name"]=="myplan" || a["_source"]["plan_name"]=="myplan_infinity");
      });
      for(let i in source)
      {
        let data_id = source[i]["_id"];
        let data_source = source[i]["_source"];
        data_source["id"] = data_id;

        let data_plan_name  = data_source["plan_name"];
        let data_source_price = data_source["price"];

        let plan_name = data_source["plan_name"];
        if(!plans_obj.hasOwnProperty(plan_name) && data_source["type"]=="default" && myplan_min_price>=data_source_price && data_plan_name=="myplan")
        {
          context["current_plans"].push(data_id);
          plans_obj[plan_name] = data_source;
          myplan_min_price = data_source_price;
        }
        if(!plans_obj.hasOwnProperty(plan_name) && data_source["type"]=="default" && myplan_infinity_min_price>=data_source_price && data_plan_name=="myplan_infinity")
        {
          context["current_plans"].push(data_id);
          plans_obj[plan_name] = data_source;
          myplan_infinity_min_price = data_source_price;
        }
      }
    }
    let plan_names = Object.keys(plans_obj);
    console.log("Sending Plans : ", plan_names, price_status);
    if(plan_names.length>0)
    {
      let attribute_context_keys = Object.keys(context["attribute_context"]);
      if(attribute_context_keys.indexOf("price")!=-1)
      {
        attribute_context_keys[attribute_context_keys.indexOf("price")] = "Price";
      }
      if(attribute_context_keys.indexOf("4g/3g data")!=-1)
      {
        attribute_context_keys[attribute_context_keys.indexOf("4g/3g data")] = "4G/3G data";
      }
      if(attribute_context_keys.indexOf("local")!=-1 && attribute_context_keys.indexOf("std")!=-1)
      {
        attribute_context_keys.splice(attribute_context_keys.indexOf("local"),1);
        attribute_context_keys.splice(attribute_context_keys.indexOf("std"),1);
        attribute_context_keys.push("Local + STD");
      }
      attribute_context_keys = attribute_context_keys.filter(function(a){return a!="required_attributes_for_process"});
      let user_given_needs_message = Bot_Questions.textMessages("As per your "+attribute_context_keys.join(", ")+" requirements. Here is the plan!");
      messages.push(user_given_needs_message);

      let plans_info = Bot_Questions.plansInfoMessage(sessionId, plans_obj);
      messages.push(plans_info);
      context["previous_function"] = "sendingPlans";
      let ask_plans_status = Bot_Questions.givenPlanStatusQuestion();
      messages.push(ask_plans_status);
      callback(messages);
    }
    else
    {
      let attribute_context = JSON.parse(JSON.stringify(context["attribute_context"]));
      if(attribute_context.hasOwnProperty("std") && attribute_context.hasOwnProperty("local"))
        delete attribute_context["std"];

      delete attribute_context["required_attributes_for_process"];
      let attribute_context_keys = Object.keys(attribute_context);
      let no_plans_message = Bot_Questions.noPlansFoundMessage();

      messages.push(no_plans_message);
      if(attribute_context_keys.length!=1)
      {
        context["previous_function"] = "no-plans-in-attribute";
        getNoPlansAttributeInfo(attribute_context_keys, context, function(get_attribute_info){
          let no_attribute_plans_found = Bot_Questions.moreAttributesNoPlansMessage(get_attribute_info);
          messages.push(no_attribute_plans_found);
          callback(messages);
        });
      }
      else
      {
        let field = "price";
        if(attribute_context_keys[0]=="4g/3g data")
          field = "4g_3g_data";
        if(attribute_context_keys[0]=="local" || attribute_context_keys[0]=="std")
          field = "local_std_calls";
        let aggs_query = {
            "max_value":{ "max" : { "field" : field } },
            "min_value":{ "min" : { "field" : field } }
        };
        let min_max_query = {
          index : "airtel_test",
          body:
          {
            size:0,
            aggs: aggs_query
          }
        };
        getElasticDataSync(min_max_query, "aggregations", function(min_max_range_info){
          //console.log(min_max_range_info);
          let min_value = min_max_range_info["min_value"]["value"];
          let max_value = min_max_range_info["max_value"]["value"];
          max_value = (max_value==200000||max_value==999999999999999)?"unlimited":Math.round(max_value * 100)/100;

          let range_value = min_value +" - "+ max_value;
          let no_attribute_plans_info = Bot_Questions.noAttributePlansInfo(attribute_context_keys[0], context, range_value);
          messages.push(no_attribute_plans_info);
          callback(messages);
        });
      }
    }
  });
}
function getNoPlansAttributeInfo(attribute_context_keys, context, callback)
{
  let aggs_query = {};
  if(attribute_context_keys.indexOf("price")!=-1)
  {
    if(context.hasOwnProperty("starting_price") || context.hasOwnProperty("ending_price"))
    {
      let range_query =  {
          "range": {
             "price": {
                "gte": context["starting_price"],
                "lte": context["ending_price"]
             }
          }
      };
      aggs_query["price"] =
      {
        "filter":{"bool":{"must": [range_query]}},
        "aggs":{}
      }
      if(attribute_context_keys.indexOf("4g/3g data")!=-1)
      {
        aggs_query["price"]["aggs"]["max_data"] = { "max" : { "field" : "4g_3g_data" } };
        aggs_query["price"]["aggs"]["min_data"] = { "min" : { "field" : "4g_3g_data" } };
      }
      if(attribute_context_keys.indexOf("local")!=-1 || attribute_context_keys.indexOf("std")!=-1)
      {
        aggs_query["price"]["aggs"]["max_local_std_calls"] = { "max" : { "field" : "local_std_calls" } },
        aggs_query["price"]["aggs"]["min_local_std_calls"] = { "min" : { "field" : "local_std_calls" } }
      }
    }
  }
  if(attribute_context_keys.indexOf("4g/3g data")!=-1)
  {
    if(context.hasOwnProperty("starting_data") || context.hasOwnProperty("ending_data"))
    {
      let range_query =  {
          "range": {
             "4g_3g_data": {
                "gte": context["starting_data"],
                "lte": context["ending_data"]
             }
          }
      };
      aggs_query["4g_3g_data"] =
      {
        "filter":{"bool":{"must": [range_query]}},
        "aggs":{}
      }
      if(attribute_context_keys.indexOf("price")!=-1)
      {
        aggs_query["4g_3g_data"]["aggs"]["max_price"] = { "max" : { "field" : "price" } };
        aggs_query["4g_3g_data"]["aggs"]["min_price"] = { "min" : { "field" : "price" } };
      }
      if(attribute_context_keys.indexOf("local")!=-1 || attribute_context_keys.indexOf("std")!=-1)
      {
        aggs_query["4g_3g_data"]["aggs"]["max_local_std_calls"] = { "max" : { "field" : "local_std_calls" } };
        aggs_query["4g_3g_data"]["aggs"]["min_local_std_calls"] = { "min" : { "field" : "local_std_calls" } };
      }
    }
  }
  if(attribute_context_keys.indexOf("local")!=-1 || attribute_context_keys.indexOf("std")!=-1)
  {
    if(context.hasOwnProperty("starting_local_minutes") || context.hasOwnProperty("ending_local_minutes"))
    {
      let range_query =  {
          "range": {
             "local_std_calls": {
                "gte": context["starting_local_minutes"],
                "lte": context["ending_local_minutes"]
             }
          }
      };
      aggs_query["local_std_calls"] =
      {
        "filter":{"bool":{"must": [range_query]}},
        "aggs":{}
      }
      if(attribute_context_keys.indexOf("price")!=-1)
      {
        aggs_query["local_std_calls"]["aggs"]["max_price"] = { "max" : { "field" : "price" } };
        aggs_query["local_std_calls"]["aggs"]["min_price"] = { "min" : { "field" : "price" } };
      }
      if(attribute_context_keys.indexOf("4g/3g data")!=-1)
      {
        aggs_query["local_std_calls"]["aggs"]["max_data"] = { "max" : { "field" : "4g_3g_data" } };
        aggs_query["local_std_calls"]["aggs"]["min_data"] = { "min" : { "field" : "4g_3g_data" } };
      }
    }
  }
  let plans_query = {
    index : "airtel_test",
    body:
    {
      size:0,
      aggs: aggs_query
    }
  };
  getElasticDataSync(plans_query, "aggregations", function(source_data){
    console.log(JSON.stringify(source_data, null, 2));
    let sentences = [], buttons = [];
    if(source_data.hasOwnProperty("price"))
    {
      buttons.push("price");
      let price_value_string = (context["price"][0]==999999999999999?"unlimited":context["price"][0]+" rupees");
      let string = "for less than "+price_value_string+", ";
      if(source_data["price"].hasOwnProperty("max_local_std_calls"))
      {
        let local_min_value = source_data["price"]["min_local_std_calls"]["value"];
        let local_max_value = source_data["price"]["max_local_std_calls"]["value"];
        local_max_value = (local_max_value==200000?"unlimited":Math.round(local_max_value*100)/100);
        let local_std_calls_string = local_min_value+" - "+local_max_value+" Minutes";
        if(local_min_value==null)
          local_std_calls_string = "Nothing available";
        string+= "Local & STD minutes range available: "+local_std_calls_string+"\n";
      }
      if(source_data["price"].hasOwnProperty("max_data"))
      {
        let data_min_value = source_data["price"]["min_data"]["value"];
        let data_max_value = source_data["price"]["max_data"]["value"];
        data_max_value = (data_max_value==999999999999999?"unlimited":Math.round(data_max_value*100)/100);
        let data_string = data_min_value+" - "+data_max_value+" GB";
        if(data_min_value==null)
          data_string = "Nothing available";
        string+= "Data range available: "+data_string+"\n";
      }
      sentences.push(string);
    }
    if(source_data.hasOwnProperty("4g_3g_data"))
    {
      buttons.push("data");
      let data_value_string = (context["4g/3g data"][0]==999999999999999?"unlimited":context["4g/3g data"][0]+" GB");
      let string = "for greater than "+data_value_string+", ";
      if(source_data["4g_3g_data"].hasOwnProperty("max_local_std_calls"))
      {
        let local_min_value = source_data["4g_3g_data"]["min_local_std_calls"]["value"];
        let local_max_value = source_data["4g_3g_data"]["max_local_std_calls"]["value"];
        local_max_value = (local_max_value==200000?"unlimited":Math.round(local_max_value *100)/100);
        let local_std_calls_string = local_min_value+" - "+local_max_value+" Minutes";
        if(local_min_value==null)
          local_std_calls_string = "Nothing available";
        string+= "Local & STD minutes range available : "+local_std_calls_string+"\n";
      }
      if(source_data["4g_3g_data"].hasOwnProperty("max_price"))
      {
        let price_min_value = source_data["4g_3g_data"]["min_price"]["value"];
        let price_max_value = source_data["4g_3g_data"]["max_price"]["value"];
        price_max_value = (price_max_value==999999999999999?"unlimited":Math.round(price_max_value * 100)/100);
        let price_string = price_min_value+" - "+price_max_value+" rupees";
        if(price_min_value==null)
          price_string = "Nothing available";
        string+= "Price range available : "+price_string+"\n";
      }
      sentences.push(string);
    }
    if(source_data.hasOwnProperty("local_std_calls"))
    {
      buttons.push("local & std minutes");
      let local_std__value_string = (context["local"][0]==200000?"unlimited":context["local"][0]+" Minutes");
      let string = "for greater than "+local_std__value_string+", ";
      if(source_data["local_std_calls"].hasOwnProperty("max_price"))
      {
        let price_min_value = source_data["local_std_calls"]["min_price"]["value"];
        let price_max_value = source_data["local_std_calls"]["max_price"]["value"];
        price_max_value = (price_max_value==999999999999999?"unlimited":Math.round(price_max_value * 100)/100);
        let price_string = price_min_value+" - "+price_max_value+" rupees";
        if(price_min_value==null)
          price_string = "Nothing available";
        string+= "Price range available : "+price_string+"\n";
      }
      if(source_data["local_std_calls"].hasOwnProperty("max_data"))
      {
        let data_min_value = source_data["local_std_calls"]["min_data"]["value"];
        let data_max_value = source_data["local_std_calls"]["max_data"]["value"];
        data_max_value = (data_max_value==999999999999999?"unlimited":Math.round(data_max_value*100)/100);
        let data_string = data_min_value+" - "+data_max_value+" GB";
        if(data_min_value==null)
          data_string = "Nothing available";
        string+= "Data range available : "+data_string+"\n";
      }
      sentences.push(string);
    }
    callback({sentences:sentences,buttons:buttons});
  });
}
function buildQuery(context)
{
  let user_query = {
    index: "airtel_test",
    body:{
      "query":{
        "bool":{
          "must":[
            {
              "match_phrase":{"type":"default"}
            }
          ]
        }
      }
    },
    size:1000
  };

  if(context.hasOwnProperty("starting_price") || context.hasOwnProperty("ending_price"))
  {
    let range_query =  {
        "range": {
           "price": {
              "gte": context["starting_price"],
              "lte": context["ending_price"]
           }
        }
    };
    user_query.body.query.bool.must.push(range_query);
  }
  if(context.hasOwnProperty("starting_data") || context.hasOwnProperty("ending_data"))
  {
    let range_query =  {
        "range": {
           "4g_3g_data": {
              "gte": context["starting_data"],
              "lte": context["ending_data"]
           }
        }
    };
    user_query.body.query.bool.must.push(range_query);
  }
  if(context.hasOwnProperty("starting_local_minutes") || context.hasOwnProperty("ending_local_minutes"))
  {
    let range_query =  {
        "range": {
           "local_std_calls": {
              "gte": context["starting_local_minutes"],
              "lte": context["ending_local_minutes"]
           }
        }
    };
    user_query.body.query.bool.must.push(range_query);
  }
  return user_query;
}
function getCurrentPlans(current_plans, callback)
{
  let current_plans_data = [];
  let current_plans_query = 
  {
    "index": "airtel_test",
    body: {query:{bool : {should: []}}}
  };
  let should_query = current_plans.map(function(a){
    return {match_phrase:{"_id":a}}
  });
  current_plans_query.body.query.bool.should = should_query;
  getElasticDataSync(current_plans_query, "hits", function(source){
    if(source.length>0)
    {
      for(let i in source)
      {
        let plan_source = source[i]["_source"];
        plan_source["id"] = source[i]["_id"];
        current_plans_data.push(plan_source);
      }
    }
    callback(current_plans_data);
  });
}
function getElasticDataSync(query, type, callback)
{
  let source = [];
  if(type=="hits")
  {
    elasticsearch.runQuery(query, function(response, total, err)
    {
      if(!err && total>0)
      {
        source = response;
      }
      callback(source);
    });
  }
  else
  {
    elasticsearch.getAggregations(query, function(response, err)
    {
      console.log()
      if(!err)
      {
        source = response;
      }
      callback(source)
    });
  }
}

function getSelectedPlanDetails(price, plan_name, callback)
{
  let query = {
    index: "airtel_test",
    body: {
      query:{
        bool:
        {
          must:[
            {
              match_phrase: {"price":price}
            },
            {
              match_phrase: {"plan_name":plan_name}
            },
            {
              match_phrase: {"type":"default"}
            }
          ]
        }
      }
    },
    size:100
  };
  console.log(JSON.stringify(query, null, 2));
  elasticsearch.runQuery(query, function(response, total, err){
    console.log(total)
    let source = [];
    if(!err && total>0)
    {
      try
      {
        source = response.filter(function(a){return a["_source"]["type"]=="default";});
        source = source.map(function(a){ a["_source"]["id"]=a["_id"]; return a;})
        source = source.map(function(a){return a["_source"];});
      }catch(e){}
    }
    callback(source);
  })
}
function testMessage()
{
  /*let horizontal_buttons_message = 
  {
    "text": "Here's a quick reply!",
    "quick_replies":[
      {
        "content_type":"text",
        "title":"Search",
        "payload":"<POSTBACK_PAYLOAD>",
        "image_url":"http://example.com/img/red.png"
      },
      {
        "content_type":"location"
      },
      {
        "content_type":"text",
        "title":"Something Else",
        "payload":"<POSTBACK_PAYLOAD>"
      }
    ]
  };*/
  /*let swipe_left_right_group_buttons = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [
          {
            "title": "Swipe left/right for more options.",
            "buttons": [
              {
                "type": "postback",
                "title": "Button 1",
                "payload": "button1"
              },
              {
                "type": "postback",
                "title": "Button 2",
                "payload": "button2"
              },
              {
                "type": "postback",
                "title": "Button 3",
                "payload": "button3"
              }
            ]
          },
          {
            "title": "Swipe left/right for more options.",
            "buttons": [
              {
                "type": "postback",
                "title": "Button 4",
                "payload": "button4"
              },
              {
                "type": "postback",
                "title": "Button 5",
                "payload": "button5"
              },
              {
                "type": "postback",
                "title": "Button 6",
                "payload": "button6"
              }
            ]
          }
        ]
      }
    }
  };*/
  let message = {
    "attachment":
    {
      "type": "template",
      "payload": 
      {
        "template_type": "generic",
        "elements": 
        [
          {
            "title": "Here's your coupon",
            "image_url": "https://i.ytimg.com/vi/abtlWWY-6Y8/hqdefault.jpg",
            "subtitle": "expires November 14, 2016",
            "buttons":[
              {
                "type": "postback",
                "title": "Button 1",
                "payload": "button1"
              }
            ]
          }
        ]
      }
    }
  };
  return message;
}
function getPlanWithAdjective(sessionId, context, adjective_value, callback){
  let messages = [];

  let query = {
    index: "airtel_test",
    body:{
      query:{
        match_all:{}
      },
      size:1000
    }
  };
  if(adjective_value=="cheapest")
  {
    query.body["sort"] = [{"price":"asc"}];
  }
  if(adjective_value=="highest")
  {
    query.body["sort"] = [{"price":"desc"}];
  }
  getElasticDataSync(query, "hits", function(source){
    let myplans = source.filter(function(a){return a["_source"]["plan_name"]=="myplan";});
    let myplans_infinity = source.filter(function(a){return a["_source"]["plan_name"]=="myplan_infinity";});
    let plans_details = myplans.concat(myplans_infinity);
    context["current_plans"] = [];
    let plans_obj = {};
    for(let i in source)
    {
      let data_id = source[i]["_id"];
      let data_source = source[i]["_source"];
      data_source["id"] = data_id;

      let data_plan_name  = data_source["plan_name"];
      let data_source_price = data_source["price"];

      let plan_name = data_source["plan_name"];
      if(!plans_obj.hasOwnProperty(plan_name) && data_source["type"]=="default" && (data_plan_name=="myplan" || data_plan_name=="myplan_infinity"))
      {
        context["current_plans"].push(data_id);
        plans_obj[plan_name] = data_source;
        myplan_min_price = data_source_price;
      }
    }
    let plans_info = Bot_Questions.plansInfoMessage(sessionId, plans_obj);
    messages.push(plans_info);
    context["previous_function"] = "sendingPlans";
    let ask_plans_status = Bot_Questions.givenPlanStatusQuestion();
    messages.push(ask_plans_status);
    callback(messages);
  });
}
function removeContextKeys(context)
{
  let context_keys = Object.keys(context);
  for(let i in context_keys)
  {
    if(context_keys[i]!="_fbid_" && context_keys[i]!="mobile_number" && context_keys[i]!="user_name")
    {
      delete context[context_keys[i]];
    }
  }
  return context
}
module.exports = {
  getFunctionName: getFunctionName,
  testMessage: testMessage,
  functionContextMap: functionContextMap,
  functionAttributeMap: functionAttributeMap,
  getBestPlan: getBestPlan,
  getPlanDetails: getPlanDetails,
  getRequirePlans: getRequirePlans,
  getCurrentPlans: getCurrentPlans,
  getSelectedPlanDetails: getSelectedPlanDetails,
  removeContextKeys: removeContextKeys,
  getElasticDataSync: getElasticDataSync,
  getPlanWithAdjective: getPlanWithAdjective
}