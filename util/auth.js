
var WebSocket = require('faye-websocket'),
    ws        = new WebSocket.Client('wss://pro-ws.btcc.com/');

var async = require('async');

var responseData;

var BPIPrice;

var orderBook;

ws.on('open', function(event) {
    console.log('Websocket Open');
    //console.log(event);
    //ws.send('Hello, world!');
});

ws.on('message', function(event) {
    //console.log('message', event.data);
    var data = JSON.parse(event.data);
    //console.log(data.MsgType);

    if(data.MsgType == "Heartbeat"){
        console.log("√");
    }else if(data.MsgType == "ErrorResponse"){
        console.log('Error', data);
    }else if(data.MsgType == "OrderBookResponse") {
        orderBook = data.List;

    }
    else{
        console.log(event.data);
        responseData = event.data;
    }


});

ws.on('close', function(event) {
    console.log('close', event.code, event.reason);
    ws = null;
});

ws.on('error', function(event){
    console.log('error', event);
});



module.exports = {

    initialize: function() {
        // BPI price request
        var BPIRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"BPICNY","Depth":9});
        ws.send(BPIRequest);
        // OrderBook Request
        var OrderBookRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"XBTCNY","Depth":2});
        ws.send(OrderBookRequest);

        async.parallel([
            function(callback){
                var BPIRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"BPICNY","Depth":9});
                ws.send(BPIRequest);
            }

        ])



    },

    getBPI: function() {

        // using whilst to handle first BPI has not updated yet
        async.whilst(
            function () { return !BPIPrice },
            function (callback) {
                setTimeout(callback, 100);
            },
            function (err) {
                return BPIPrice;
            }
        );

    },

    getOrderBook: function() {
        async.whilst(
            function () { return !orderBook },
            function (callback) {
                setTimeout(callback, 100);
            },
            function (err) {
                return orderBook;
            }
        );
    }



}