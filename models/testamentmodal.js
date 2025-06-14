const mongoose = require("mongoose");

const TestamentSchema = new mongoose.Schema({
    name: {type:String, require:true, unique : true},
    languageId : {type : mongoose.Schema.Types.ObjectId, ref:'Language', required:true},
    active: { type: Boolean, default: true },
},
    {
        timestamps:true
    }
)

module.exports = mongoose.model('Testament', TestamentSchema);