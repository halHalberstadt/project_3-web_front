const express = require("express");
const mysql = require('mysql');
const app = express();
const pool = dbConnection();
const bcrypt = require('bcrypt');
const session = require('express-session');
const port = 3000;

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
}); // landing page

//TODO: signup page

app.get('/signup', async (req, res) => {
  res.render('signup');
});

app.post('/signup', logger, async (req, res) => {
  // NOTE: UNFINISHED
  let username = req.body.uname;
  let userPassword = req.body.psw;
  console.log(userPassword);
  
  let passwordHash = "";
  
  let sql = ``;
  let data = await executeSQL(sql, [username] );
  
  req.session.authenticated = false;
  req.session.destroy();
  res.redirect('/');
  res.render('signup');
}); // signup

//TODO: login page

app.get('/login', async (req, res) => {
  res.render('login');
});

app.post('/login', logger, async (req, res) => {
  // NOTE: UNFINISHED
  let username = req.body.uname;
  let userPassword = req.body.psw;
  console.log(userPassword);
  
  let passwordHash = "";
  
  let sql = `SELECT username, password 
            FROM user
            WHERE username = ? `;
  let data = await executeSQL(sql, [username] );        
  if (data.length > 0) {  //checks if record found
    passwordHash = data[0].password;
  }
     
  const matchPassword = await bcrypt.compare(userPassword, passwordHash);
  console.log(matchPassword);

  if (matchPassword) {
    alert("login success");
    req.session.authenticated = true;
    res.render('home');
  } else {
    alert("login failed");
    res.render('login', {"error":"Invalid credentials"});
  }
}); // login

app.get('/new_transaction', async (req, res) => {
    res.render('new_transaction');
}); // new transaction

app.post("/new_transaction", async function(req, res) {
  let targetUser = req.body.targetUser;
  let amount = req.body.amount;

});


/** API specific routes */

// base uri that shows all the api specific endpoints
let api_base = "/api";
app.get(api_base, logger, async (req, res) => {
  res.render('api_base');
});

/** USER CRUD FOR API */

app.get(api_base+'/create_user/:username/:password/:admin/:cardListId/:userListId/:transactionListId', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
  let usrnm = req.params.username;
  // console.log(usrnm);
  let pswrd = req.params.password;
  // console.log(pswrd);
  let admn = req.params.admin;
  // console.log(admn);
  let crdLstId = req.params.cardListId;
  // console.log(crdLstId);
  let usrLstId = req.params.userListId;
  // console.log(usrLstId);
  let trnsctnLstId = req.params.userListId;
  // console.log(trnsctnLstId);
  let rounds = 12;
  
  hashword = bcrypt.hashSync(pswrd, rounds);
  //console.log(password);
  let params = [usrnm, hashword, admn, crdLstId, usrLstId, trnsctnLstId];
  let sql = `INSERT INTO user (username, password, admin, card_list_id, user_list_id, transaction_list_id)
            VALUES(?, ?, ?, ?, ?, ?)`;
  // console.log(params);
  let rows = await executeSQL(sql, params);
  // console.log(rows);
  res.render('success');
    
  } catch (error) {
    res.render('failure');
  }
}); // api create user

app.get(api_base+'/retrieve_user/:userId', logger, async (req, res) => {
  try {
    // let usrId = req.params.userId;
    let sql = `SELECT * FROM user WHERE user_id=${req.params.userId}`;
    let rows = await executeSQL(sql);
    res.render('retrieve_u', { "user": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user

app.get(api_base+'/retrieve_users', logger, async (req, res) => {
  try {
    let sql = "SELECT * from user order by username asc";
    let rows = await executeSQL(sql);
  res.render('retrieve_us', { "user": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all users

app.get(api_base+'/update_user/:userId/:username/:password/:admin/:cardListId/:userListId/:bank/:transactionListId', logger, async (req, res) => {
  try {
  let usrid = req.params.userId
  let usrnm = req.params.username
  let usrps = req.params.password
  let usrad = req.params.admin
  let usrcrdl = req.params.cardListId
  let usrusrl = req.params.userListId    
  let usrbnk = req.params.bank
  let usrtrsl = req.params.transactionListId
  
  let sql = `UPDATE user SET username='${usrnm}', password='${usrps}', admin=${usrad}, card_list_id=${usrcrdl}, card_list_id=${usrcrdl}, user_list_id=${usrusrl}, bank=${usrbnk}, transaction_list_id=${usrtrsl} WHERE user_id=${usrid};`;
  let rows = await executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user

app.get(api_base+'/delete_user/:userId', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM user WHERE user_id=${req.params.userId}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user

/** END OF USER API */

/** TRANSACTION CRUD FOR API */

app.get(api_base+'/create_transaction/:tid/:amt/:cur/:fin/:sid/:rid/:desc', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
  let trnsctn = req.params.tid;
  let amnt = req.params.amt;
  let crrncy = req.params.cur;
  let fnlzd = req.params.fin;
  let sndng = req.params.sid;
  let rcvng = req.params.rid;
  let dscrptn = req.params.desc;
  
  let params = [trnsctn, amnt, crrncy, fnlzd, sndng, rcvng, dscrptn];
  let sql = `INSERT INTO transaction (transaction_id, amount, currency,	is_finalized,	sending_id,	receiving_id,	description)
            VALUES(?, ?, ?, ?, ?, ?, ?)`;
  // console.log(params);
  let rows = await executeSQL(sql, params);
  // console.log(rows);
  res.render('success');
    
  } catch (error) {
    res.render('failure');
  }
}); // api create user

app.get(api_base+'/retrieve_transaction/:tid', logger, async (req, res) => {
  try {
    let sql = `SELECT * FROM transaction WHERE transaction_id=${req.params.tid}`;
    let rows = await executeSQL(sql);
    res.render('retrieve_t', { "transaction": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user

app.get(api_base+'/retrieve_transactions', logger, async (req, res) => {
  try {
    let sql = "SELECT * from transaction order by transaction_id asc";
    let rows = await executeSQL(sql);
  res.render('retrieve_ts', { "transaction": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all users

app.get(api_base+'/update_transaction/:tid/:amt/:cur/:fin/:sid/:rid/:desc', logger, async (req, res) => {
  try {
  let trnsctn = req.params.tid;
  let amnt = req.params.amt;
  let crrncy = req.params.cur;
  let fnlzd = req.params.fin;
  let sndng = req.params.sid;
  let rcvng = req.params.rid;
  let dscrptn = req.params.desc;
  
  let sql = `UPDATE transaction SET amount='${amnt}', currency='${crrncy}',	is_finalized='${fnlzd}', sending_id='${sndng}', receiving_id='${rcvng}',	description='${dscrptn}' WHERE transaction_id='${trnsctn}';`;
  let rows = await executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user

app.get(api_base+'/delete_transaction/:tid', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM transaction WHERE user_id=${req.params.tid}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user

/** END OF TRANSACTION API*/


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
  // console.log("logger: " + res);
  // console.log("logger: " + next);
  next();
}

//start server
app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
  console.log("Express server running...")
})