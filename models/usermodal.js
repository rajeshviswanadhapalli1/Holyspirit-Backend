const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:{type: String, required: false},  
  mobile: { type: String, required: true, unique: true },
  profilePic: { type: String, default: '' },
  verified : {type:Boolean,default:false},
  active:{type:Boolean,default:true},
  dailyPromise: { type: Boolean, default: false },
  languagePreference: {
    type: String,
    enum: ['english', 'telugu'],
    default: 'telugu',
  },
},
{
    timestamps: true
}
);


userSchema.methods.updateDailyPromiseStatus = async function(status) {
    this.dailyPromise = status;
    await this.save();
    return this;
}
module.exports = mongoose.model('User', userSchema);