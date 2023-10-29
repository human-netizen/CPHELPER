const mongoose = require('mongoose'); 

const ProblemSchema = new mongoose.Schema({
    problemID: String,
    time: String,
    note: String,
    tag: String
})

const UserStatSchema = new mongoose.Schema({
    handle: String,
    solvedProblems: [ProblemSchema],
    unsolvedProblems: [ProblemSchema]
})

module.exports = mongoose.model('UserStat',UserStatSchema);
