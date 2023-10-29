const mongoose = require('mongoose');

async function connectDB(url){
    try {
        await mongoose.connect(url);
    } catch (error) {
        console.log(error); 
    }
}

module.exports = {connectDB}; 