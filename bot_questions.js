module.exports = {
	textMessages: function(text){
		let message =
		{
			"text": text
		};
		return message;
	},
	getStarted: function()
	{
		let get_started =
		{
			"get_started":{
				"payload":"hi"
			}
		};
		return get_started;
	},
	greetMessage : function()
	{
		let greet_message = {
	      "text":"Hi, I am your Airtel Assistant. I can help you select postpaid plans as per your need"
	    };
	    return greet_message;
	},
	askPhoneNumberMessage : function(message_status)
	{
		let ask_phone_number = {
	      "text":"Please provide me your phone number"
	    };
	    if(message_status)
	    {
	    	ask_phone_number.text = "Message me your phone number"
	    }
	    return ask_phone_number;
	},
	invalidNumberMessage : function()
	{
		let message =
		{
          "text": "Invalid number. Please enter your phone number again"
        };
        return message;
	},
	validNumberMessage : function()
	{
		let message =
		{
          "attachment":{
            "type":"template",
            "payload":
            {
              "template_type":"button",
              "text": "I have sent you an OTP. Please message me your OTP to verify your number",
              "buttons":
              [
                {
                  "type":"postback",
                  "title":"Resend OTP",
                  "payload":"resend-otp"
                }
              ]
            }
          }
        };
        return message;
	},
	bestPlanInfoMessage : function(best_plan)
	{
		let title_info = best_plan["price"]+" - "+best_plan["plan_name"];
		let subtitle_info = "Data 4G/3G : "+ best_plan["4g_3g_data"]+" GB\n"
			+ "Local + STD minutes : "+ (best_plan["local_std_calls"]==200000?"unlimited":best_plan["local_std_calls"]);
		let plans_info =
	    {
		    "attachment":
		    {
		      "type": "template",
		      "payload":
		      {
		        "template_type": "generic",
		        "elements":
		        [
					{
						"title": title_info,
						"image_url": best_plan["image_url"],
						"subtitle": subtitle_info,
						"buttons":[
						  {
						    "type": "web_url",
						    "title": "Learn more",
						    "url":"https://www.prodx.in/airtel_bot/plans?plan_id="+best_plan["id"],
						    "webview_height_ratio":"compact",
						    "messenger_extensions": true
						  }
						]
					}
		        ]
		      }
		    }
		};
	    return plans_info;
	},
	askPlanStatusQuestion: function()
	{
		let ask_plan_status = {
			"text": "Are you happy with the above plan?",
			"quick_replies":[
				{
					"content_type":"text",
					"title":"YES",
					"payload":"yes"
				},
				{
					"content_type":"text",
					"title":"NO",
					"payload":"no"
				},
				{
					"content_type":"text",
					"title": "Reset",
					"payload":"reset"
				}
			]
		};
		return ask_plan_status;
	},
	askSelectedPlanStatusQuestion: function()
	{
		let ask_plan_status = {
			"text": "Should I proceed with above plan?",
			"quick_replies":[
				{
					"content_type":"text",
					"title":"YES",
					"payload":"yes"
				},
				{
					"content_type":"text",
					"title":"NO",
					"payload":"no"
				},
				{
					"content_type":"text",
					"title": "Reset",
					"payload":"reset"
				}
			]
		};
		return ask_plan_status;
	},
	askNameMessage: function()
	{
		let ask_name = {
			"text": "What is your full name? (for verification)"
		};
		return ask_name;
	},
	planConfirmedMessage: function(username, plan_name)
	{
		let confirmed_plan_message = {
	      text: "Thanks for the info. "+(username?username+",":"")+" Your plan has changed to "+plan_name
	    };
	    return confirmed_plan_message;
	},
	planDetailsMessage: function(plan_details)
	{
		let title_info = plan_details["plan_name"]+" - "+ plan_details["price"]
		let subtitle_info = "";
		if(plan_details["local_std_calls"] && plan_details["local_std_calls"]!="na")
			subtitle_info += "Local + STD Calls : "+(plan_details["local_std_calls"]==200000?"unlimited":plan_details["local_std_calls"])+" minutes\n";
		if(plan_details["4g_3g_data"] && plan_details["4g_3g_data"]!="na")
			subtitle_info += "3G/4G Data : "+(plan_details["4g_3g_data"]==999999999999999?"unlimited":plan_details["4g_3g_data"])+" GB"+"\n";
		if(plan_details["free_sms"] && plan_details["free_sms"]!="na")
			subtitle_info += "Free SMS : "+(plan_details["free_sms"]==999999999999999?"unlimited":plan_details["free_sms"])+"\n";
		if(plan_details["roaming_incoming"] && plan_details["roaming_incoming"]!="na")
			subtitle_info += "Roaming Incoming : "+(plan_details["roaming_incoming"]==999999999999999?"unlimited":plan_details["roaming_incoming"])+"\n";
		if(plan_details["roaming_outgoing"] && plan_details["roaming_outgoing"]!="na")
			subtitle_info += "Roaming Outgoing : "+(plan_details["roaming_outgoing"]==999999999999999?"unlimited":plan_details["roaming_outgoing"])+"\n";
		let message =
		{
		    "attachment": {
		      "type": "template",
		      "payload": {
		        "template_type": "generic",
		        "elements": [
					{
						"title": title_info,
						"subtitle": subtitle_info
					}
	            ]
		      }
		    }
		};
		return message;
	},
	userRequirementQuestion: function()
	{
		let user_requirement_question = {
			"text": "What do you want to customize among  Data, Price, Local + STD minutes?",
			"quick_replies":[
				{
					"content_type":"text",
					"title":"Data",
					"payload":"change data"
				},
				{
					"content_type":"text",
					"title":"Local + STD minutes",
					"payload":"change local and std"
				},
				{
					"content_type":"text",
					"title":"Price",
					"payload":"change price"
				},
				{
					"content_type":"text",
					"title":"Data and Price",
					"payload":"change data price"
				},
				{
					"content_type":"text",
					"title":"Data & Local/STD mins",
					"payload":"change data local std"
				},
				{
					"content_type":"text",
					"title":"Price & Local/STD mins",
					"payload":"change price local std"
				},
				{
					"content_type":"text",
					"title": "All",
					"payload":"all"
				},
				{
					"content_type":"text",
					"title": "Reset",
					"payload":"reset"
				}
			]
	    };
	    return user_requirement_question;
	},
	plansInfoMessage: function(sessionId, require_plans)
	{
		let element_options = [];
		if(require_plans.hasOwnProperty("myplan"))
		{
			let myplan_data = require_plans["myplan"];
			let subtitle_info = "Data 4G/3G : "+ myplan_data["4g_3g_data"]+" GB\n"
				+ "Local + STD minutes : "+ (myplan_data["local_std_calls"]==200000?"unlimited":myplan_data["local_std_calls"])+" Minutes";
			let object = {
				"title": myplan_data["price"]+" - My plan",
				"image_url": myplan_data["image_url"],
				"subtitle": subtitle_info,
				"buttons":[
					{
						"type": "web_url",
						"title": "Learn more",
						"url":"https://www.prodx.in/airtel_bot/plans?plan_id="+myplan_data["id"],
						"webview_height_ratio":"compact",
						"messenger_extensions": true
					},
					{
						"type": "web_url",
						"title": "Customize",
						"url":"https://www.prodx.in/airtel_bot/customize?price="+myplan_data["price"]+"&user_id="+sessionId,
						"webview_height_ratio":"compact",
						"messenger_extensions": true
					}
				]
			};
			element_options.push(object);
		}
		if(require_plans.hasOwnProperty("myplan_infinity"))
		{
			let myplan_infinity_data = require_plans["myplan_infinity"];
			let subtitle_info = "Data 4G/3G : "+ myplan_infinity_data["4g_3g_data"]+" GB\n"
				+ "Local + STD minutes : "+ (myplan_infinity_data["local_std_calls"]==200000?"unlimited":myplan_infinity_data["local_std_calls"])+" Minutes";
			let object = {
				"title": myplan_infinity_data["price"]+" - My Plan Infinity",
				"image_url": myplan_infinity_data["image_url"],
				"subtitle": subtitle_info,
				"buttons":[
					{
						"type": "web_url",
						"title": "Learn more",
						"url":"https://www.prodx.in/airtel_bot/plans?plan_id="+myplan_infinity_data["id"],
						"webview_height_ratio":"compact",
						"messenger_extensions": true
					}
				]
			};
			element_options.push(object);
		}
		if(require_plans.hasOwnProperty("myplan") && require_plans.hasOwnProperty("myplan_infinity"))
		{
			let myplan_data = require_plans["myplan"];
			let myplan_infinity_data = require_plans["myplan_infinity"];
			console.log(myplan_data["price"], myplan_infinity_data["price"]);
			if(myplan_data["price"] > myplan_infinity_data["price"])
			{
				try{
					let temp_obj = JSON.parse(JSON.stringify(element_options[0]));
					element_options[0] = JSON.parse(JSON.stringify(element_options[1]));
					element_options[1] = JSON.parse(JSON.stringify(temp_obj));
					console.log("Swapped")
				}catch(e){}
			}
		}
		let plans_info = {
	        "attachment": {
	          "type": "template",
	          "payload": {
	            "template_type": "generic",
	            "elements": element_options
	          }
	        }
	    };
	    return plans_info;
	},
	changeRequirementsQuestion: function()
	{
		let change_requirements =
		{
		  "text": "change your requirements here",
	      "quick_replies":[
	        {
	          "content_type":"text",
	          "title":"Change 4G/3G data",
	          "payload":"change 4g/3g data"
	        },
	        {
	          "content_type":"text",
	          "title":"Change price value",
	          "payload":"change price value"
	        },
	        {
	          "content_type":"text",
	          "title":"Change local minutes",
	          "payload":"change local minutes"
	        },
	        {
				"content_type":"text",
				"title": "Reset",
				"payload":"reset"
			}
	      ]
		};
		return change_requirements;
	},
	priceRequirementQuestion: function()
	{
		let price_requirement_question = {
	      text : "How much Monthly Rental can you afford? (in rupees)"
	    };
	    return price_requirement_question;
	},
	dataRequirementQuestion: function()
	{
		let data_requirement_question = {
	      text : "What would be your approx. 4G/3G data consumption per month? (Eg: 150 MB, 5 GB etc.)"
	    };
	    return data_requirement_question;
	},
	localStdMinutesRequirementQuestion: function()
	{
		let local_std_minutes_requirement_question = {
	      text : "What is your approx. monthly Local + STD minutes usage? (Eg: 3000 minutes, Unlimited etc.)"
	    };
	    return local_std_minutes_requirement_question;
	},
	successMessage: function()
	{
		let message = {
			"text":"Excellent. Now I have connected your account to Messenger."
		};
		return message;
	},
	airtelPlansInfo: function()
	{
		let airtel_plans_info =
		{
			text : "I can help you with the plan right away (or) you can message me like\n"
				+ "- Suggest a plan\n"
				+ "- Plan with 3 GB monthly data\n"
				+ "- Plan with unlimited local + STD\n"
				+ "- Plan with 2 GB data below 400",
			"quick_replies":
			[
				{
					"content_type":"text",
					"title": "Suggest a plan",
					"payload": "suggest a plan"
				}
			]
	    };
	    return airtel_plans_info;
	},
	invalidOtpMessage: function()
	{
		let invalid_otp_message =
		{
			"attachment":
			{
				"type":"template",
				"payload":{
				  "template_type":"button",
				  "text": "Invalid OTP. Send me the OTP again\n\t(or)",
				  "buttons":[
				    {
				      "type":"postback",
				      "title":"Resend OTP",
				      "payload":"resend-otp"
				    },
				    {
				      "type": "postback",
				      "title": "Change Phone number",
				      "payload": "ask-phone-number"
				    }
				  ]
				}
	  		}
	    };
	    return invalid_otp_message;
	},
	givenPlanStatusQuestion: function()
	{
		let message =
		{
			"text": "Are you happy with the above plan(s)?",
			"quick_replies":[
				{
					"content_type":"text",
					"title":"YES",
					"payload":"yes"
				},
				{
					"content_type":"text",
					"title":"NO",
					"payload":"no"
				},
				{
					"content_type":"text",
					"title": "Reset",
					"payload":"reset"
				}
			]
		};
		return message
	},
	havingMorePlansMessage: function(plans_details)
	{
		let quick_replies = plans_details.map(function(plan){
			return {
				"content_type":"text",
				"title":plan["price"]+ " - " +plan["plan_name"],
				"payload":plan["price"]+ " - " +plan["plan_name"]
			};
		});
		quick_replies.push({
			"content_type":"text",
			"title": "Reset",
			"payload":"reset"
		});
		let message = {
			"text": "Which one do you want to go for?",
			"quick_replies": quick_replies
		};
		return message;
	},
	noAttributePlansInfo: function(attribute, context, range)
	{
		let sentence = "";
		if(attribute=="price")
			sentence = 'I have not found any plans less than "'+context[attribute][0]+'" rupees.\nPrice range available : '+range+" rupees";
		else if(attribute=="local" || attribute=="std")
			sentence = 'I have not found any plans greater than "'+(context[attribute][0]==200000?"unlimited":context[attribute][0])+'" minutes.\Locan & STD minutes range available : '+range +" minutes";
		else if(attribute=="4g/3g data")
			sentence = 'I have not found any plans greater than "'+ (context[attribute][0]==999999999999999?"unlimited":context[attribute][0]+" GB")+'".\nData range available : '+range+" GB";

		let message = this.textMessages(sentence);
		message.quick_replies = [
			{
				"content_type":"text",
				"title":"Change "+attribute+" requirements",
				"payload":"Change "+attribute
			},
			{
				"content_type":"text",
				"title": "Reset",
				"payload":"reset"
			}
		];
		return message;
	},
	noPlansFoundMessage: function(){
		let message = this.textMessages("No plans available as per your need");
		return message;
	},
	moreAttributesNoPlansMessage: function(error_requirements)
	{
		let message = this.textMessages(error_requirements.sentences.join("\n"));
		message.quick_replies = error_requirements.buttons.map(function(a){
			return {
				"content_type":"text",
				"title":"Change "+a,
				"payload": a
			}
		});
		message.quick_replies.push({
			"content_type":"text",
			"title": "Reset",
			"payload":"reset"
		});
		return message
	},
	noPlanFoundMessage: function(selected_plan)
	{
		let message = this.textMessages("I have not found \""+selected_plan+"\"");
		message.quick_replies = [
			{
				"content_type":"text",
				"title":"Suggest a plan",
				"payload": "suggest a plan"
			}
		];
		return message;
	},
	resetMessage: function()
	{
		let message = {
			"text": "Ok, we will start again"
		};
		return message;
	}
};
