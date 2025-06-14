const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
    name: {type:String, require:true, unique : true},
    languageId : {type : mongoose.Schema.Types.ObjectId, ref:'Language', required:true},
    testamentId : {type : mongoose.Schema.Types.ObjectId, ref:'Testament', required:true},
    chapterCount:{type:Number, required:true},
    active: { type: Boolean, default: true },
},
    {
        timestamps:true
    }
)

module.exports = mongoose.model('Book', BookSchema);