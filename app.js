const express=require('express');
const bodyParser=require("body-parser");
const app=express();
const path = require("path");   
app.use(express.json({ limit: '100mb' }));  
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.static('public')); // Assuming 'public' is the directory containing 'images'


const userRoute = require('./src/routes/user.route')


app.use(bodyParser.json());
app.use((req,res,next)=>{
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PATCH,PUT,DELETE,OPTIONS" 
    );
    next();
});

app.use('/api/user', userRoute);


module.exports = app;