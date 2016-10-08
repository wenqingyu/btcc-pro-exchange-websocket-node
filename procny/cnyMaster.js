/**
 * Created by thomasyu on 3/10/16.
 */


var WebSocket = require('faye-websocket'),
    ws        = new WebSocket.Client('wss://pro-ws.btcc.com/');

// Signature
var jsSHA = require('jssha');
var guid = require('guid');
//


var isOpen = false;
ws.on('open', function(event) {
    console.log('Websocket Open');
});

ws.on('close', function(event) {
    console.log('close', event.code, event.reason);
    ws = null;
});

ws.on('error', function(event){
    console.log('error', event);
});

ws.on('message', function(event) {
    if(!isOpen){
        isOpen = true;
        initial();
    }


    var data = JSON.parse(event.data);

    if(data.MsgType == "Heartbeat"){
        console.log("√"); // Heartbeat
    }else if(data.MsgType == "ErrorResponse"){
        console.log('Error', data);
    }else{
        //console.log(data);
        updateData(data);
        // Process your response data here
    }
});

/* --- EXECUTION --- */
var execution = {


    getOrderBook: function(){
        // get orderbook request
        console.log('Orderbook');
        var quoteRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"XBTCNY","Depth":5});
        ws.send(quoteRequest);
    },

    getBPI: function(){
        // get BPI request
        console.log('BPI');
        var BPIRequest = JSON.stringify({"MsgType":"QuoteRequest","QuoteType":"2","Symbol":"BPICNY","Depth":1});
        ws.send(BPIRequest);

    },

    getTrades: function(){
        // get orderbook request
        console.log('Trades');
        var tradeRequest = JSON.stringify({"MsgType":"GetTradesRequest","Count":"20","Symbol":"XBTCNY"});
        ws.send(tradeRequest);
    },

    loginRequest: function(){
        // Login Request
        console.log('Login');
        var data = {"MsgType":"LoginRequest","Email":"yuwenqingisu@gmail.com","Account":"482116","Password":"bb961a8b-800c-4347-b299-a787954bf8fe"};
        data.Signature = getSignature(data.MsgType, data.Email, data.Account, data.Password);
        data = JSON.stringify(data);
        ws.send(data);
    },

    getOrderRequest: function(){
        // Login Request
        console.log('getOrderRequest');

        var data = {"MsgType": "GetOrdersRequest", "Status": "A,0,1,2", "Begin": '0', End: Date.now().toString()};
        data.Signature = getSignature(data.MsgType, data.Begin, data.End, data.Status);
        data = JSON.stringify(data);
        ws.send(data);

        var ordersExecutionsParam = {"MsgType": "GetOrdersRequest", "Status": "3,S", "Begin": (Date.now()-1000*60*60*24).toString(), End: Date.now().toString()};
        ordersExecutionsParam.Signature = getSignature(ordersExecutionsParam.MsgType, ordersExecutionsParam.Begin, ordersExecutionsParam.End, ordersExecutionsParam.Status);
        ordersExecutionsParam = JSON.stringify(ordersExecutionsParam);
        ws.send(ordersExecutionsParam)

    },

    placeLimitBuy: function(price, quantity){
        var uid = guid.raw();

        var data = {"MsgType":"PlaceOrder","SecurityType":"Crypto","PositionEffect":"O","Quantity": quantity,"Price": price,"StopPrice":0,"TIF":"1","ExprDate":"0","ExprTime":"00:00:00","Symbol":"XBTCNY","OrderType":"2","Side":"1","ClOrdID": uid};
        data.Signature = getSignature(data.MsgType, data.ClOrdID, data.Symbol, data.Side, data.SecurityType, data.OrderType, data.PositionEffect, data.Quantity, data.Price, data.StopPrice, data.TIF, data.ExprDate, data.ExprTime);
        data = JSON.stringify(data);
        ws.send(data);
        return uid;
    },

    placeLimitSell: function(price, quantity){
        var uid = guid.raw();

        var data = {"MsgType":"PlaceOrder","SecurityType":"Crypto","PositionEffect":"O","Quantity": quantity,"Price": price,"StopPrice":0,"TIF":"1","ExprDate":"0","ExprTime":"00:00:00","Symbol":"XBTCNY","OrderType":"2","Side":"2","ClOrdID": uid};
        data.Signature = getSignature(data.MsgType, data.ClOrdID, data.Symbol, data.Side, data.SecurityType, data.OrderType, data.PositionEffect, data.Quantity, data.Price, data.StopPrice, data.TIF, data.ExprDate, data.ExprTime);
        data = JSON.stringify(data);
        ws.send(data);
        return uid;
    },

    cancelReplaceOrder: function(order, price, quantity){
        if(order == undefined){
            return ;
        }
        var uid = guid.raw();
        var data = {"MsgType":"CancelReplaceOrderRequest","ClOrdID": uid,"OrigClOrdID": order.OrdID,"Quantity": quantity,"Price":price,"StopPrice":0}
        data.Signature = getSignature(data.MsgType, data.ClOrdID, data.OrigClOrdID, data.Quantity, data.Price, data.StopPrice);
        data = JSON.stringify(data);
        ws.send(data);
        return uid;
    }



}

/* --- PARAMS --- */
var params = {
    getLow: function(n){
        return bids[n];
    },

    getHigh: function(n){
        return asks[n];
    },

    getPlow: function(){
        return pBid.Price.toFixed(1);
    },

    getPhigh: function(){
        return pAsk.Price.toFixed(1);
    },

    getBPI: function(){
        return bpi.toFixed(1);
    }
}


/* --- ACTION --- */
var action = {
    highTo: function(price){
        actionHighFlag = true;
        price = price.toFixed(1);
        console.log("Phigh ->", price);
        execution.cancelReplaceOrder(pAsk, price, 1);

    },

    highToSafe: function(){
        execution.placeLimitSell(newPhigh, 1); // start with a great high price

    },

    lowTo: function(price){
        actionLowFlag = true;
        price = price.toFixed(1);
        console.log("Plow ->", price);
        execution.cancelReplaceOrder(pBid, price, 1);

    },

    lowToSafe: function(){
        execution.placeLimitBuy(newPlow, 1); // start with a great low price

    }
}


/* --- STRATEGY --- */
var strategy = {
    priority: ''
}


/* ------- Variables ------- */
var bpi = 0;
var ticker;
var profile = {};

var orderbooks = [];
var asks = [];
var bids = [];

// Multi-strategy
var pendingAsk = [];
var pendingBid = [];

var pAsk, pBid;


var recordHigh = [newPhigh];
var recordLow = [newPlow];

var actionHighFlag = false;
var actionLowFlag = false;

var newPhigh = 9999.1;
var newPlow = 1.1;
var highLowGap = 2;

function initial(callback){
    execution.getOrderBook();
    execution.getBPI();
    execution.loginRequest();
    console.log("----------------------------------------")
    // Initial Pending
    action.highToSafe(); // start with a small price
    action.lowToSafe(); // start with a great high price
    callback;

}

function checkLoop(){

    // Initial Finished Check
    if(asks.length * bids.length == 0 || bpi == 0 || pAsk == undefined || pBid == undefined){
        // if these data finished collect, it is ready to trade
        console.log("Waiting for some data");
        return ;
    }

    console.log(params.getHigh(0),
        params.getLow(0),
        params.getBPI(),
        params.getPhigh(),
        params.getPlow());

    var high0 = params.getHigh(0);
    var high1 = params.getHigh(1);
    var low0 = params.getLow(0);
    var low1 = params.getLow(1);





    console.log('recordHigh', 'recordLow');
    console.log(recordHigh.length, recordLow.length);

    if((high0.Price - low0.Price) < highLowGap){ // Check price gap
        console.log('High Low Gap <', highLowGap);
        return;
    }

    // SUCCEED PAIR PRICE LOCK ON CELIING AND BOTTON
    if(params.getPlow() == newPlow && params.getPhigh() == newPhigh && (recordHigh.length + recordLow.length) > 2){
        console.log('| PRICE RESET |');
        actionLowFlag = false; // Set Flag done
        actionHighFlag = false; // Set Flag done
        return ; // skip once
    }


    console.log("---------------- High states: ", (recordHigh.length - recordLow.length));

    console.log("---------------- Low States: ", (recordLow.length - recordHigh.length));


    // High Strategy
    if(!actionHighFlag && (recordHigh.length - recordLow.length) < 1){ // Last Execution haven't finished / High order exceeded
        console.log('pHigh', 'High0', 'High1');
        console.log(params.getPhigh(), high0.Price, high1.Price);

        if(high0.Price != params.getPhigh()){   // high0 is not Phigh
            console.log('case 1');
            action.highTo(high0.Price - 0.1);
        }else{ // high0 == Phigh, Phigh is on first edge of orderbook
            if(high0.Size > 1){ // pHigh is not the only one
                console.log('case 2: pHigh escape from follower');
                action.highTo(high0.Price - 0.1);
            }else if(high0.Size == 1 && (high1.Price - params.getPhigh()) >= 0.2){ // pHigh is the only one but not stick on high1
                console.log('case 3: pHigh Push back to high1 - 0.1');
                action.highTo(high1.Price - 0.1);
            }else{
                console.log('CASE 4: pHigh stay for this round');
            }
        }

    }else if(!actionHighFlag && (recordHigh.length - recordLow.length) > 0){

        if(params.getPhigh() != newPhigh){
            // If High price is not on safe price, push up to highest
            action.highTo(newPhigh);
        }
    }else{
        console.log('High Flag', actionHighFlag);

    }

    // Low Strategy
    if(!actionLowFlag && (recordLow.length - recordHigh.length) < 1){ // Last Execution have't finished / Low order exceeded
        console.log('pLow', 'Low0', 'Low1');
        console.log(params.getPlow(), low0.Price, low1.Price);

        if(low0.Price != params.getPlow()){   // low0 is not pLow
            console.log('case 5: Go to the edge');
            action.lowTo(low0.Price + 0.1);
        }else{ // low0 == pLow, pLow is on first edge of orderbook
            if(low0.Size > 1){ // pLow is not the only one
                console.log('case 6: pLow escape from follower');
                action.lowTo(low0.Price + 0.1);
            }else if(low0.Size == 1 && (params.getPlow() - low1.Price) >= 0.2){ // pLow is the only one but not stick on low1
                console.log('case 7: pLow push back to low1 + 0.1');
                action.lowTo(low1.Price + 0.1);
            }else{
                console.log('CASE 8: pLow stay for this round');
            }
        }
    }else if(!actionLowFlag && (recordLow.length - recordHigh.length) > 0){

        if(params.getPlow() != newPlow){
            // If Low Price is not on low safe, push down to lowest
            action.lowTo(newPlow);
        }
    }else{
        console.log('Low Flag', actionLowFlag);
    }
}





/**
 * If websocket received data
 * It will come to here for processing
 * @param data
 */
function updateData(data){
    // BPI
    if(data.Symbol == 'BPICNY'){
        bpi = data.Last;
    }

    // Ticker
    if(data.Symbol == 'XBTCNY' && data.MsgType == 'Ticker'){
        ticker = data;
    }

    // Initial Orderbook
    if(data.Symbol == 'XBTCNY' && data.MsgType == 'OrderBookResponse' && data.Type == 'F'){
        orderbooks = data.List;
    }

    // Incremental Orderbook
    if(data.Symbol == 'XBTCNY' && data.MsgType == 'OrderBookResponse' && data.Type == 'I'){
        // update orderbook
        orderbooks = orderbookSort(addNewOrder(orderbooks, data.List));
        // update ask / bid
        updateAskBid(orderbooks);
        // update checkLoop
        checkLoop();
    }

    // Order Execution Response Receive
    if(data.MsgType == 'ExecReport'){


        if(data.Status == '2'){
            // Filled Order
            console.log(data);

            if(data.Side == '1'){ // Bid: Low Filled
                recordLow.push(data.Price);
                pBid = undefined;
                action.lowToSafe();
                console.log("Low Filled: ", data.Price);

            }else if(data.Side == '2'){ // Ask: High Filled
                recordHigh.push(data.Price);
                pAsk = undefined;
                action.highToSafe();
                console.log("High Filled: ", data.Price);
            }

            return ;

        }

        if(data.Text){
            var type = JSON.stringify(data.Text).substr(1,8);

            console.log('type', type);
            if(type == 'Canceled'){
                console.log('ExeResponse: Canceled');
                if(data.Side == 1){
                    pAsk = undefined;
                }else if(data.Side = 2){
                    pBid = undefined;
                }
            }else if(type == 'Replaced'){
                /* --- Replaced --- */
                console.log('Replace')
                if(data.Side == 2){
                    pAsk = data;
                    //console.log('ask', pAsk.ClOrdID, pAsk.ClOrdID, pAsk.Side, pAsk.LeaveQty, pAsk.Price);
                    actionHighFlag = false;

                }else if(data.Side = 1){
                    pBid = data;
                    //console.log('bid', pBid.ClOrdID, pBid.ClOrdID, pBid.Side, pBid.LeaveQty, pBid.Price);
                    actionLowFlag = false;
                }
                console.log('ExeResponse: Replaced');

            }

        }else{
            /* --- Other Type --- */
            if(data.Side == 2){
                pAsk = data;
                //console.log('ask', pAsk.ClOrdID, pAsk.ClOrdID, pAsk.Side, pAsk.LeaveQty, pAsk.Price);

            }else if(data.Side = 1){
                pBid = data;
                //console.log('bid', pBid.ClOrdID, pBid.ClOrdID, pBid.Side, pBid.LeaveQty, pBid.Price);
            }

            console.log('ExeResponse: ', type)
        }

        return ;

    }

    // AccountInfo
    if(data.MsgType == 'AccountInfo'){
        profile = data;
    }



}



/* --- SIGNATURE --- */
function getSignature(data){
    var accountKey = 'bb961a8b-800c-4347-b299-a787954bf8fe';
    accountKey = new jsSHA(accountKey, "TEXT").getHash("SHA-1", "B64");
    var joinStr = Array.prototype.join.call(arguments, '');
    var shaObj = new jsSHA(joinStr, "TEXT");
    var hmac = shaObj.getHMAC(accountKey, "TEXT", "SHA-1", "HEX");
    return hmac;
}




/**
 * Handle INCREMENTAL ORDERBOOK
 * @param orderbook
 * @returns {Array.<T>}
 */
function orderbookSort(orderbook){
    return orderbook.sort(priceCompare);
}

function priceCompare(order1, order2){
    return order1.Price - order2.Price;
}

function addNewOrder(orderbook, orders){

    orders.forEach(function(newOrder){
        var hasExist = false;
        orderbook.forEach(function(order, index, object){
            if(priceCompare(order, newOrder) == 0){
                order.Size += newOrder.Size;
                hasExist = true;
                if(order.Size == 0){
                    // remove this order
                    object.splice(index, 1);
                }
            }
        })
        if(!hasExist){
            orderbook.push(newOrder);
        }
    })
    return orderbook;
}

function updateAskBid(orderbook){
    bids = [];
    asks = [];
    orderbook.forEach(function(order){
        if(order.Side == '1'){
            bids.unshift(order);
        }else if(order.Side == '2'){
            asks.push(order);
        }
    })
}

/* ----- HANDLE INCREMENTAL ORDERBOOK FINISHED ----- */


/* ----- PALCEORDER FUNCTIONS ----- */

function findPendingOrderByPrice(price){


}


function startsWith(str, pre){
    return str.slice(0, pre.length) === pre;
}



/* ----- PALCEORDER FUNCTIONS FINISHED ----- */