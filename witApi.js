var request = require("request");
const baseURL =  'https://api.wit.ai';
const Config = require('./const.js');
const token = Config.WIT_TOKEN;
const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
};
function getOptions(qs) {
    return {
        method: 'GET',
        url: baseURL + '/message?' + qs,
        headers: headers
    }
}

function witMessageAPI(message, context, cb){
    if (typeof context === 'function') {
        cb = context;
        context = undefined;
    }
    var qs = 'q=' + encodeURIComponent(message);
    if (context) {
        qs += '&context=' + encodeURIComponent(JSON.stringify(context));
    }

    request(getOptions(qs), function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let data = JSON.parse(body);
            cb(data["entities"]);
        }
        else{
            console.log("error occurred");
        }
    });
}

module.exports = {
    witMessageAPI:witMessageAPI
};