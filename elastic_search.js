const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
    host: 'https://user:jk4wfZRBJmgd@35.198.210.38/elasticsearch'
});
/*
* this is used to get elastic search response by using the query
* @param {obj} query
*/
function runQuery(query, callback) {
    // console.log(JSON.stringify(query,null,2));
    query.requestTimeout = 100000;
    client.search(query).then(function (resp) {
        var hits = resp.hits.hits;
        callback && callback(hits,resp.hits.total,null);
    }, function (err) {
        console.log(err);
        console.log(JSON.stringify(query,null,2));
        callback && callback(null,null,err);
    });
}

function getAggregations(query, callback) {
    // console.log(JSON.stringify(query,null,2));
    query.requestTimeout = 100000;
    client.search(query).then(function (resp) {
        var aggs = resp.aggregations;
        callback && callback(aggs, null);
    }, function (err) {
        console.log(err);
        callback && callback(null,err);
    });
}
/*
* this count api gives the count
* @param {obj} query
*/
function getCount(query,callback)
{
    client.count(query,function(err, response)
    {
        callback(err,response.count);
    });
}
/*
* this is a synchronous function, gives the count for products
* @param {obj} query
*/
function getCountSynchronously(query)
{
    let sync = true, output = {};
    client.count(query,function(err, response)
    {
        output["error"] = err;
        output["total"] = response;
        sync = false;
    });
    while(sync) {require('deasync').sleep(100);}
    return output;
}
module.exports = {
    runQuery:runQuery,
    getCount : getCount,
    getAggregations: getAggregations,
    getCountSynchronously: getCountSynchronously
};
