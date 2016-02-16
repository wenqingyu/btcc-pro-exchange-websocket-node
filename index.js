var WebSocket = require('faye-websocket'),
    ws        = new WebSocket.Client('wss://pro-ws.btcc.com/');

ws.on('open', function(event) {
    console.log('Websocket Open');
    //console.log(event);
    //ws.send('Hello, world!');
});

ws.on('message', function(event) {
    console.log('message', event.data);
    var data = JSON.parse(event.data);
    //console.log(data.MsgType);

    if(data.MsgType == "Heartbeat"){
        console.log("√");
    }else if(data.MsgType == "ErrorResponse"){
        console.log('Error', data);
    }else{
        //console.log(event);
    }


});

ws.on('close', function(event) {
    console.log('close', event.code, event.reason);
    ws = null;
});

ws.on('error', function(event){
    console.log('error', event);
});

//
//app.factory('getSignature', ['accountInfo', function (accountInfo) {
//    return function () {
//        var joinStr = Array.prototype.join.call(arguments, '');
//        var shaObj = new jsSHA(joinStr, "TEXT");
//        var hmac = shaObj.getHMAC(accountInfo.accountKey, "TEXT", "SHA-1", "HEX");
//        return hmac;
//    };
//}]);



var placeOrderRequest = {"MsgType":"GetTradesRequest","Count":"20","Symbol":"XBTCNY","Signature":"62527e49f181f97e898d298414dfbbc158fb97bc"};
var acountId = "496917";
var password = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczpcL1wvd3d3LmJ0Y2MuY29tIiwiYXVkIjoiNDk2OTE3IiwiZXhwIjoxNDU0MzI2Mjc0LCJpYXQiOjE0NTQzMDQ2NzQsIm90cCI6ZmFsc2UsInJlbSI6ZmFsc2UsImFwaSI6ImFjY291bnQifQ.4YfRXy-IoDKaSJ7QQCDqQaLz-3AzqUkmXNsPTagmqb4";
//var loginRequest = JSON.stringify({MsgType:"LoginRequest", Email: "thomas.yu@btcchina.com", Account: acountId, Password: password});

var loginRequest = JSON.stringify({"MsgType":"LoginRequest","Email":"thomas.yu@btcchina.com","Account":"496917","Password":"c1ab1bb6-36d6-4d78-8f1a-3002ca7c94fd","Signature":"61de13a8518a19cba231ecd64fc6cb631f8a2511"});
var quoteRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"XBTCNY","Depth":9});

console.log(quoteRequest);
ws.send(quoteRequest);