require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose'); 
const {connectDB} = require('./db/connect'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const cors = require('cors');
const User = require('./model/User'); 
const UserStat = require('./model/UserStat');

const app = express();
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cors());

app.get('/', async (req,res)=>{
    try {
        res.status(200).json({msg:`hello niloy`}); 
    } catch (error) {
        console.log(error); 
    }
})

app.get('/niloy/userstat', authenticateToken, async (req,res)=>{
    try {
        const user = await UserStat.findOne({handle:req.handle});
        if(!user){
            return res.status(404).json({msg:`user not found`});
        }
        res.status(200).json(user); 
    } catch (error) {
        console.log(error); 
    }
})

// app.patch('/niloy/unsolvedProblem', authenticateToken, async (req,res)=>{
//     try {
//         const user = await UserStat.findOne({handle:req.handle});
//         if(!user){
//             return res.status(404).json({msg:`user not found`});
//         }
//         const problem = req.body;
//         user.unsolvedProblems.push(problem);
//         await user.save();
//         res.status(200).json({user}); 
//     } catch (error) {
//         console.log(error); 
//     }
// })


app.patch('/niloy/unsolvedProblem', authenticateToken, async (req, res) => {
    try {
        const user = await UserStat.findOne({ handle: req.handle });

        if (!user) {
            return res.status(404).json({ msg: `User not found` });
        }

        const { problemID, ...updatedProblemData } = req.body;

        // Check if the problemID exists in the user's unsolvedProblems array
        const existingProblemIndex = user.unsolvedProblems.findIndex(
            (problem) => problem.problemID === problemID
        );

        if (existingProblemIndex !== -1) {
            // If the problemID exists, update the existing problem with new data
            user.unsolvedProblems[existingProblemIndex] = {
                ...user.unsolvedProblems[existingProblemIndex],
                problemID,  // Keep the problemID intact
                ...updatedProblemData,
            };
        } else {
            // If the problemID doesn't exist, add a new problem to the list
            user.unsolvedProblems.push({ problemID, ...updatedProblemData });
        }

        await user.save();
        res.status(200).json({ user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




// app.patch('/niloy/solvedProblem/:id', authenticateToken, async (req,res)=>{
//     try {
//         const user = await UserStat.findOne({handle:req.handle}); 
//         if(!user){
//             return res.status(404).json({msg:`no user found`});
//         }
//         const problemID = req.params.id;
//         const problemIndex1 = user.solvedProblems.findIndex(problem=>problem.problemID===problemID);



//         const problemIndex = user.unsolvedProblems.findIndex(problem=>problem.problemID===problemID);

//         if(problemIndex===-1){
//             return res.status(404).json({msg:`problem with the id ${problemID} not found in the unsolved list for this user`}); 
//         }
//         user.unsolvedProblems.splice(problemIndex, 1);
//         const newSolvedProblem = req.body;
//         user.solvedProblems.push(newSolvedProblem);
//         await user.save(); 
//         res.status(200).json({user}); 
//     } catch (error) {
//         console.log(error); 
//     }
// })

app.patch('/niloy/solvedProblem/:id', authenticateToken, async (req, res) => {
    try {
        const user = await UserStat.findOne({ handle: req.handle });

        if (!user) {
            return res.status(404).json({ msg: `No user found` });
        }

        const problemID = req.params.id;

        // Check if the problemID exists in the solvedProblems array
        const solvedProblemIndex = user.solvedProblems.findIndex(
            (problem) => problem.problemID === problemID
        );

        if (solvedProblemIndex !== -1) {
            // If the problemID exists in the solvedProblems list, update it
            user.solvedProblems[solvedProblemIndex] = {
                ...user.solvedProblems[solvedProblemIndex],
                ...req.body,
            };
        } else {
            // If the problemID doesn't exist in the solvedProblems list,
            // check if it exists in the unsolvedProblems list
            const unsolvedProblemIndex = user.unsolvedProblems.findIndex(
                (problem) => problem.problemID === problemID
            );

            if (unsolvedProblemIndex === -1) {
                return res.status(404).json({
                    msg: `Problem with the id ${problemID} not found in the unsolved list for this user`,
                });
            }

            // Remove the problem from the unsolvedProblems list
            const removedProblem = user.unsolvedProblems.splice(
                unsolvedProblemIndex,
                1
            )[0];

            // Preserve the 'time', 'note', and 'tag' fields when moving to the solvedProblems list
            user.solvedProblems.push({
                problemID,
                ...removedProblem,
                time: removedProblem.time,
                note: removedProblem.note,
                tag: removedProblem.tag,
            });
        }

        await user.save();
        res.status(200).json({ user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.post('/niloy/register', async (req,res)=>{
    try {
        const {handle, password} = req.body;
        if(!handle || !password){
            return res.status(400).json({msg:'please enter all details'});
        }
        const userExist = await User.findOne({handle:handle});
        if(userExist){
            return res.status(409).json({msg:'user already exists'});
        }
        const hashedPassword = await bcrypt.hash(password,10);
        const accessToken = jwt.sign({handle:handle},process.env.ACCESS_TOKEN_SECRET);
        const user = new User({
            handle:handle,
            password:hashedPassword,
            accessToken: accessToken
        })
        await user.save(); 
        const userStatProfile = new UserStat({handle:handle});
        await userStatProfile.save(); 
        res.status(201).json({accessToken:accessToken}); 
    } catch (error) {
        console.log(error); 
    }
})


app.post('/niloy/login', async (req,res)=>{
    try {
        const {handle,password} = req.body;
        if(!handle || !password){
            return res.status(400).json({msg: 'all fields are required'});
        }
        const userExist = await User.findOne({handle:handle});
        if(!userExist){
            return res.status(404).json({msg:'no user found'});
        }
        const isPasswordMatched = await bcrypt.compare(password, userExist.password);
        if (!isPasswordMatched) {
            return res.status(401).json({msg:'password does not match'});
        }
        const accessToken = jwt.sign({handle:handle},process.env.ACCESS_TOKEN_SECRET);
        userExist.accessToken = accessToken;
        await userExist.save(); 
        res.status(201).json({accessToken:accessToken}); 
    } catch (error) {
        console.log(error); 
    }
})


app.delete('/niloy/logout', async (req, res) => {
    try {
        const { accessToken } = req.query;
        if (!accessToken) {
            return res.status(401).json({ msg: `accessToken is not sent to the database` });
        }
        const user = await User.findOneAndUpdate(
            { accessToken: accessToken },
            { $unset: { accessToken: 1 } }, 
            { new: true } 
        );
        if (!user) {
            return res.status(404).json({ msg: `no user found` });
        }
        res.status(204).json({user});
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ msg: 'Unauthorized: No token provided' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err); 
            return res.status(403).json({ msg: 'Unauthorized: Invalid token' });
        }
        req.handle = decoded.handle;
        next();
    });
}

async function start(){
    try {
        await connectDB(process.env.MONGO_URI);
    } catch (error) {
        console.log(error); 
    }
}

start();

app.listen(3000);
