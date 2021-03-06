var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var DIDRoute = new Schema({
    routecode: {
        type: String,
        required: true
    },
    alias: String,
    contact: String,
    printer: String,
    faxcatid: {
        type: ObjectId,
        ref: 'faxcategory'
    }
});

module.exports = mongoose.model('didroute', DIDRoute);