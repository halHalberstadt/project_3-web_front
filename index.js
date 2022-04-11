const express = require("express");
const mysql = require('mysql');
const app = express();
const pool = dbConnection();
const bcrypt = require('bcrypt');
const session = require('express-session');

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static("public"));

app.set('trust proxy', 1); // trust first proxy
app.use(session({
  secret: 'secret_key!',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

//routes
app.get('/', async (req, res) => {
  // if(!isAuthenticated){
  //  res.render('index_loggedIn');
  // } else {
    res.render('index');
  // }
});

//functions
async function executeSQL(sql, params) {
  return new Promise(function(resolve, reject) {
    pool.query(sql, params, function(err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });
}//executeSQL


function dbConnection() {

  const pool = mysql.createPool({

    connectionLimit: 10,
    host: "d6rii63wp64rsfb5.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "a0oz4qii667gex91",
    password: "ad5xssa37hnbbows",
    database: "ikt0ksnjoqkf8eq5"

  });

  return pool;

} //dbConnection

app.get('/logout', (req, res) => {
   req.session.authenticated = false;
   req.session.destroy();
   res.redirect('/');
});

function isAuthenticated(req,res,next){
  
  console.log("is authenticated");

  if (!req.session.authenticated) {
    res.redirect("/");
  } else {
    next();
  }

}

function logger(req,res,next){
  console.log("logger");
  next();
}

//start server
app.listen(3000, () => {
  console.log("Expresss server running...")
})