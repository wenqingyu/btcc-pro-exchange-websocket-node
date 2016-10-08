/**
 * Created by thomasyu on 5/30/16.
 */

console.log("tool");

exports.modules = {

    getSignature: function(data){
        console.log("get Signature");
        var joinStr = Array.prototype.join.call(data, '');
        var shaObj = new jsSHA(joinStr, "TEXT");
        var hmac = shaObj.getHMAC(accountInfo.accountKey, "TEXT", "SHA-1", "HEX");
        return hmac;
    }
}