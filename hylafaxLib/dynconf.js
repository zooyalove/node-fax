#!/usr/bin/env node

var func = require('./../globalFunc');
var db = require('./../models');
var DynamicConfig = require('./../helper/DynamicConfig');

if (process.argv.length === 2) {
    console.error(process.argv[1] + ' device CallID1 CallIDn ...');
    process.exit(1)
}

var device = process.argv[2];

var callid1;


if (!func.isset(process.argv[3]) || func.empty(process.argv[3])) {
    callid1 = "EMPTY CALLID";
} else {
    callid1 = func.strip_sipinfo(process.argv[3]);
}
console.log('CallID1 : ', callid1);

func.faxlog("dynconf> checking CallID1 " + callid1 + " on device " + device, true);

var dc = new DynamicConfig();

var conf = dc.lookup(device, callid1);
conf.then((data) => {
    console.log(data);
    
	func.faxlog("dynconf> rejecting " + callid1 + " on device " + device, true);
	console.log("RejectCall: true");

    db.close();

}, (err) => {
    console.log(err);
    console.log('자료가 없으모니다...');
    db.close();

})
.catch( (err) => {
    console.log(err);
    console.log('자료가 없으모니다...');
    db.close();

});
