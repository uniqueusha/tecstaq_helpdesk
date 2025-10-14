const express=require('express');
const bodyParser=require("body-parser");
const app=express();
const path = require("path");   
app.use(express.json({ limit: '100mb' }));  
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.static('public')); // Assuming 'public' is the directory containing 'images'


const userRoute = require('./src/routes/user.route');
const departmentRoute = require('./src/routes/department.route');
const roleRoute = require('./src/routes/role.route');
const priorityRoute = require('./src/routes/priority.route');
const ticketCategories = require('./src/routes/ticket-categories.route');


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
app.use('/api/department', departmentRoute);
app.use('/api/role', roleRoute);
app.use('/api/priority', priorityRoute);
app.use('/api/ticket-categories', ticketCategories);


module.exports = app;