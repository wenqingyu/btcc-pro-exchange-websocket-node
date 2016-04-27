/**
 * Created by thomasyu on 3/10/16.
 */


var WebSocket = require('faye-websocket'),
    ws        = new WebSocket.Client('wss://pro-ws.btcc.com/');

var url = "ws://192.168.1.12:8080/orderbook";

ws.on('open', function(event) {
    console.log('Websocket Open');
});

ws.on('message', function(event) {
    var data = JSON.parse(event.data);

    if(data.MsgType == "Heartbeat"){
        console.log("√"); // Heartbeat
    }else if(data.MsgType == "ErrorResponse"){
        console.log('Error', data);
    }else{
        console.log(data);
        // Process your response data here
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
//// get orderbook request
//var quoteRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"XBTCNY","Depth":100});
//
////get trades request
//var tradeRequest = JSON.stringify({"MsgType":"GetTradesRequest","Count":"20","Symbol":"XBTCNY"});
//
//// get BPI Index request
//var BPIRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"BPICNY","Depth":1}); // set depth = 1, there is no more depth than 1
//
//// put the request you need to send
//ws.send(quoteRequest);