const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    handle: String,
    password: String,
    accessToken: String,
})

module.exports= mongoose.model('User',userSchema); 