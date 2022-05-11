const express = require("express");
const mysql = require('mysql');
const app = express();
const pool = dbConnection();
const bcrypt = require('bcrypt');
const session = require('express-session');
const port = 3000
const saltRounds = 10;
//const fetch = require('node-fetch');

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
  let userPasswordRepeat = req.body.psw_repeat;

  // Check if username exists in database
  let sql = `SELECT username 
            FROM user
            WHERE username = ? `;
  let data = await executeSQL(sql, [username]);
  console.log(data[0]);
  
  if(data.length){
    res.render('signup', {"signupError":true})
  }else{
      if(userPassword == userPasswordRepeat){
      bcrypt.hash(userPassword, saltRounds, async function(err, hash) {
      // Store hash password and username in DB.
      userPassword = hash;
      sql = `INSERT INTO user (username, password) VALUES (?, ?)`;
    
      let params = [username, userPassword];
      let userData = await executeSQL(sql,params); 
      req.session.authenticated = false;
      req.session.destroy();
      res.redirect('/');
      });
    }
  }


}); // signup


app.get('/login', async (req, res) => {
  res.render('login');
});

app.get('/home', isAuthenticated, async (req, res) => {
  res.render('home');
});


app.get('/my_profile', async (req, res) => {
  let userID = req.session.userID;
  let sql = `SELECT * FROM user WHERE user_id = ${userID}`;
  let myInfo= await executeSQL(sql);
  res.render('profile', {"myInfo" : myInfo});
});

app.get('/friends', isAuthenticated, async (req, res) => {
  let ownerID = req.session.userID;

  //If user sends a friend request to another user, check to see if a previous request between them has been made. if not, create a new record in table "user_list"
  if(!Object.keys(req.query).length){
    // if parameter is empty do nothing
  }else{
    let otherUsername = req.query.otheruname;
    let sql = `SELECT user_id FROM user WHERE username = "${otherUsername}"`;
    let otherUser= await executeSQL(sql);

    let params = [ownerID, otherUser[0].user_id, ownerID, otherUser[0].user_id]
    sql = `SELECT * FROM user_list WHERE owner_id = ? AND other_user_id = ? OR ( owner_id = ? AND other_user_id = ?)`;
    let rows = await executeSQL(sql, params);

    if(!rows.length){
      params = [ownerID, otherUser[0].user_id, 0]
      sql = `INSERT INTO user_list (owner_id, other_user_id, is_accepted) VALUES(?, ?, ?)`;
      let sendRequest = await executeSQL(sql, params);
    }
  }
  
  //Returning friends list
  sql = `SELECT * FROM user_list INNER JOIN user ON user_list.other_user_id = user.user_id WHERE owner_id=${ownerID}`;
  let friendsList = await executeSQL(sql);
  console.log('friends list: ' + friendsList)

  //Returning received friend request
  sql = `SELECT * FROM user_list INNER JOIN user ON user_list.owner_id = user.user_id WHERE other_user_id=${ownerID} AND is_accepted = 0`;
  let incomingRequests = await executeSQL(sql);
  
  res.render('friends', {"ownerID":ownerID, "friendsList":friendsList, "incomingRequests":incomingRequests});
});


app.post('/accept_request', isAuthenticated, async (req, res) => {
  let userID = req.session.userID;
  let otherUserID = req.body.otheruid;
  
  let sql = `UPDATE user_list SET is_accepted = 1 WHERE other_user_id = ${userID} AND owner_id = ${otherUserID}`;
  let acceptRequest = await executeSQL(sql);
  sql = `INSERT INTO user_list (owner_id, other_user_id, is_accepted) VALUES(?, ?, ?)`;
  params = [userID, otherUserID, 1];
  let addFriendToOtherUser = await executeSQL(sql, params);

  res.redirect('/friends');
  
});

app.post('/deny_request', isAuthenticated, async (req, res) => {
  let userID = req.session.userID;
  let otherUserID = req.body.otheruid;
  
  let sql = `DELETE FROM user_list WHERE other_user_id = ? AND owner_id = ?`;

  let params = [userID, otherUserID];
  let denyRequest = await executeSQL(sql, params);

  res.redirect('/friends');
  
});

app.post('/delete_friend', isAuthenticated, async (req, res) => {
  let userID = req.session.userID;
  let otherUserID = req.body.otheruid;
  let sql = `DELETE FROM user_list WHERE (owner_id = ? AND other_user_id = ?) OR (owner_id = ? AND other_user_id = ?)`;
  
  let params = [userID, otherUserID, otherUserID, userID];
  let deleteFriend = await executeSQL(sql, params);

  res.redirect('/friends');
  
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
    sql = `SELECT * FROM user WHERE username = ?`;
    let userData = await executeSQL(sql, username);
    
    
    // Setting sessions variables for logged in user
    req.session.userID = userData[0].user_id;
    req.session.username = userData[0].username;
    req.session.isAdmin = userData[0].admin;
    req.session.bank = userData[0].bank;
    req.session.cardListID = userData[0].card_list_id;
    req.session.userListID = userData[0].user_list_id;
    req.session.transListID = userData[0].transaction_list_id;
   
    res.render('home', {"userData":userData});
  } else {
    alert("login failed");
    res.render('login', {"error":"Invalid credentials"});
  }
}); // login

app.get('/new_transaction', async (req, res) => {
  let userId = req.session.userID;
  let error = req.query.error
  res.render('new_transaction', {"userId":userId, "error":error});
});

app.post("/new_transaction", async function(req, res) {
  try {
    let amt = req.body.amt;
    let cur = req.body.cur;
    let is_final = false;
    let sid = req.body.sid;
    let rid = req.body.rid;
    let desc = req.body.desc;
    // Get user bank
    let getBankSql = `SELECT bank FROM user WHERE user_id = ?`;
    let bank = (await executeSQL(getBankSql, [sid]))[0].bank;
    let reciever = (await executeSQL(getBankSql, [rid]))[0];
    // Check if funds are available
    if (bank < amt) {
      res.redirect('/new_transaction?error=Insufficient Funds');
    } else if(reciever == null) {
      res.redirect('/new_transaction?error=Target user does not exist');
    } else {
      // Update senders bank
      bank -= amt;
      let senderParams = [bank, sid];
      let updateBankSql = `UPDATE user SET bank=? WHERE user_id=?`;
      await executeSQL(updateBankSql, senderParams);
      // Create transaction
      let params = [amt, cur, is_final, sid, rid, desc];
      let sql = `INSERT INTO transaction (amount, currency, is_finalized,	sending_id,	receiving_id,	description)
              VALUES(?, ?, ?, ?, ?, ?)`;
      let rows = await executeSQL(sql, params);
      res.redirect('/');
    }
  } catch (error) {
    res.redirect('/new_transaction');
  }
}); // new transaction

app.get('/view_transactions', async (req, res) => {
  let userId = req.session.userID;
  let getTransactionsSql = `SELECT * FROM transaction WHERE sending_id = ? OR receiving_id = ? ORDER BY is_finalized, CASE WHEN receiving_id LIKE ? THEN 0 ELSE 1 END`;
  let transactions = await executeSQL(getTransactionsSql, [userId, userId, userId]);
  console.log(transactions);

  // Setup extra info
  let status = Array();
  for(element in transactions) {
    if(transactions[element].is_finalized) {
      status[element] = "Finalized";
    } else {
      status[element] = "Pending";
    }
  }

  let type = Array();
  for(element in transactions) {
    if(transactions[element].sending_id == userId) {
      type[element] = "Outgoing";
    } else {
      type[element] = "Incoming";
    }
  }

  res.render('view_transactions', {
    "userId":userId, 
    "transactions":transactions, 
    "status":status, 
    "type":type});
}); // view transactions

app.post("/accept_transaction", async function(req, res) {
  let tid = req.body.tid;
  console.log("TID: " + tid);
  // Get transaction
  let getTransactionSql = `SELECT * FROM transaction WHERE transaction_id = ?`;
  let transaction = (await executeSQL(getTransactionSql, [tid]))[0];
  console.log("Transaction: " + transaction);
  // Get bank values
  let getBankSql = `SELECT bank FROM user WHERE user_id = ?`;
  let recieverBank = (await executeSQL(getBankSql, [transaction.receiving_id]))[0].bank;
  console.log("Reciever Bank: " + recieverBank);
  console.log("Transaction Amount: " + transaction.amount);

  // Update reciever bank
  recieverBank += transaction.amount;
  let recieverParams = [recieverBank, transaction.receiving_id];
  let updateBankSql = `UPDATE user SET bank=? WHERE user_id=?`;
  await executeSQL(updateBankSql, recieverParams);
  
  // Finalize transaction
  let params = [1, tid];
  let finalizeTransactionSql = `UPDATE transaction SET is_finalized=? WHERE transaction_id=?`;
  let rows = await executeSQL(finalizeTransactionSql, params);
  
  res.redirect('/view_transactions');
}); // accept transaction

app.post("/cancel_transaction", async function(req, res) {
  let tid = req.body.tid;
  console.log("TID: " + tid);
  let getTransactionSql = `SELECT sending_id, amount FROM transaction WHERE transaction_id = ?`;
  let transactionInfo = (await executeSQL(getTransactionSql, [tid]))[0];
  console.log("Sender: " + transactionInfo.sending_id);
  // Refund sender bank
  let getBankSql = `SELECT bank FROM user WHERE user_id = ?`;
  let bank = (await executeSQL(getBankSql, [transactionInfo.sending_id]))[0].bank;
  console.log("Bank before cancel: " + bank);
  bank += transactionInfo.amount;
  let senderParams = [bank, transactionInfo.sending_id];
  let updateBankSql = `UPDATE user SET bank=? WHERE user_id=?`;
  await executeSQL(updateBankSql, senderParams);
  console.log("Bank after cancel: " + bank);
  // Delete transaction
  let deleteTransactionSql = `DELETE FROM transaction WHERE transaction_id=?`;
  let rows = await executeSQL(deleteTransactionSql, [tid]);
  res.redirect('/view_transactions');
}); // cancel transaction


/** API specific routes */

// base uri that shows all the api specific endpoints
let api_base = "/api";
app.get(api_base, logger, async (req, res) => {
  res.render('api_base');
});

/** USER CRUD FOR API */

app.get(api_base+'/create_user/*', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
	// res.send(req.query.username);
  let usrnm = req.query.username;
  // console.log(usrnm);
  let pswrd = req.query.password;
  // console.log(pswrd);
  let admn = req.query.admin;
  // console.log(admn);
  let crdLstId = req.query.cardListId;
  // console.log(crdLstId);
  let usrLstId = req.query.userListId;
  // console.log(usrLstId);
  let trnsctnLstId = req.query.userListId;
  // console.log(trnsctnLstId);
  let rounds = saltRounds;
  
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

app.get(api_base+'/retrieve_user_p/*', logger, async (req, res) => {
  try {
    let passwordHash = "";
    let userPassword = req.query.p;
  
  let sql = `SELECT user_id, username, password FROM user WHERE username = '${req.query.u}' `;
  let data = await executeSQL(sql);        
  if (data.length > 0) {  //checks if record found
    passwordHash = data[0].password;
  }
     
  const matchPassword = bcrypt.compare(userPassword, passwordHash);
    if(matchPassword){
      let rows = data[0].user_id;
      res.render('retrieve', { "data": rows });
    } else {
      res.render('failure');
    }
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user

app.get(api_base+'/retrieve_user/*', logger, async (req, res) => {
  try {
    let sql = `SELECT * FROM user WHERE username=${req.query.u} AND password=${req.query.p}`;
    let rows = await executeSQL(sql);
    let userData = rows[0];
    res.render('retrieve', { "data": userData });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user with password

app.get(api_base+'/retrieve_account/*', logger, async (req, res) => {
  try {
    // let usrId = req.params.userId;
    let sql = `SELECT * FROM user WHERE user_id=${req.query.user} AND user_id=${req.query.pass}`;
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user

app.get(api_base+'/retrieve_users', logger, async (req, res) => {
  try {
    let sql = "SELECT * from user order by username asc";
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all users

app.get(api_base+'/retrieve_users_and', logger, async (req, res) => {
  try {
    let sql = "SELECT user_id, username from user order by username asc";
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all users

app.get(api_base+'/update_user/*', logger, async (req, res) => {
  try {
  let usrid = req.query.userId
  let usrnm = req.query.username
  let usrps = req.query.password
  let usrad = req.query.admin
  let usrcrdl = req.query.cardListId
  let usrusrl = req.query.userListId    
  let usrbnk = req.query.bank
  let usrtrsl = req.query.transactionListId
  
  let sql = `UPDATE user SET username='${usrnm}', password='${usrps}', admin=${usrad}, card_list_id=${usrcrdl}, card_list_id=${usrcrdl}, user_list_id=${usrusrl}, bank=${usrbnk}, transaction_list_id=${usrtrsl} WHERE user_id=${usrid};`;
  let rows = await executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user

app.get(api_base+'/delete_user/*', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM user WHERE user_id=${req.query.userId}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user

/** END OF USER API */

/** TRANSACTION CRUD FOR API */

app.get(api_base+'/create_transaction/*', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
  let trnsctn = req.query.tid;
  let amnt = req.query.amt;
  let crrncy = req.query.cur;
  let fnlzd = req.query.fin;
  let sndng = req.query.sid;
  let rcvng = req.query.rid;
  let dscrptn = req.query.desc;
  
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

app.get(api_base+'/retrieve_transaction/*', logger, async (req, res) => {
  try {
    let sql = `SELECT * FROM transaction WHERE transaction_id=${req.query.tid}`;
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user

app.get(api_base+'/retrieve_transactions', logger, async (req, res) => {
  try {
    let sql = "SELECT * from transaction order by transaction_id asc";
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all users

app.get(api_base+'/retrieve_transactions_and/*', logger, async (req, res) => {
  try {
    let sql = `SELECT * from transaction where sending_id=${req.query.uid} OR receiving_id=${req.query.uid} order by transaction_id asc`;
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all users

app.get(api_base+'/update_transaction/*', logger, async (req, res) => {
  try {
  let trnsctn = req.query.tid;
  let amnt = req.query.amt;
  let crrncy = req.query.cur;
  let fnlzd = req.query.fin;
  let sndng = req.query.sid;
  let rcvng = req.query.rid;
  let dscrptn = req.query.desc;
  
  let sql = `UPDATE transaction SET amount='${amnt}', currency='${crrncy}',	is_finalized='${fnlzd}', sending_id='${sndng}', receiving_id='${rcvng}',	description='${dscrptn}' WHERE transaction_id='${trnsctn}';`;
  let rows = await executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user

app.get(api_base+'/delete_transaction/*', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM transaction WHERE user_id=${req.query.tid}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user

/** END OF TRANSACTION API*/

/** CARD CRUD FOR API */

app.get(api_base+'/create_card/*', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
    // card_id	card_num	expiration	cvv	holder_name	zip	card_nickname
  let card_id = req.query.cid;
  let card_num = req.query.cnum;
  let expiration = req.query.exp;
  let cvv = req.query.sec;
  let holder_name = req.query.name;
  let zip = req.query.areacode;
  let card_nickname = req.query.nick;
  
  let params = [card_id, card_num, cvv, holder_name, zip, card_nickname];
  let sql = `INSERT INTO card (card_id,	card_num, expiration,	cvv,	holder_name,	zip,	card_nickname)
            VALUES(?, ?, ?, ?, ?, ?, ?)`;
  // console.log(params);
  let rows = await executeSQL(sql, params);
  // console.log(rows);
  res.render('success');
    
  } catch (error) {
    res.render('failure');
  }
}); // api create user

app.get(api_base+'/retrieve_card/*', logger, async (req, res) => {
  try {
    let sql = `SELECT * FROM card WHERE card_id=${req.query.cid}`;
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user

app.get(api_base+'/retrieve_cards', logger, async (req, res) => {
  try {
    let sql = "SELECT * from card order by card_id asc";
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all users

app.get(api_base+'/update_card/*', logger, async (req, res) => {
  try {
  let card_id = req.query.cid;
  let card_num = req.query.cnum;
  let expiration = req.query.exp;
  let cvv = req.query.sec;
  let holder_name = req.query.name;
  let zip = req.query.areacode;
  let card_nickname = req.query.nick;
  
  let params = [card_id, card_num, cvv, holder_name, zip, card_nickname];
  
  let sql = `UPDATE card SET card_num='${card_num}', expiration='${expiration}',	cvv='${cvv}', holder_name='${holder_name}', zip='${zip}',	card_nickname='${card_nickname}' WHERE card_id='${card_id}';`;
  let rows = await executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user

app.get(api_base+'/delete_card/*', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM card WHERE card_id=${req.query.cid}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user

/** END OF CARD API*/

/** LISTS FOR API */
// all creates

app.get(api_base+'/create_card_list/*', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
    // card_id	card_num	expiration	cvv	holder_name	zip	card_nickname
  let card_list_id = req.query.clid;
  let card_id = req.query.cid;
  
  let params = [card_id, card_num];
  let sql = `INSERT INTO card_list (card_list_id,	card_id)
            VALUES(?, ?)`;
  // console.log(params);
  let rows = await executeSQL(sql, params);
  // console.log(rows);
  res.render('success');
    
  } catch (error) {
    res.render('failure');
  }
}); // api create card list

app.get(api_base+'/create_transaction_list/*', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
    // card_id	card_num	expiration	cvv	holder_name	zip	card_nickname
  let transaction_list_id = req.query.tlid;
  let user_id = req.query.uid;
  let transaction_id = req.query.tid;
  
  let params = [transaction_list_id, user_id, transaction_id];
  let sql = `INSERT INTO transaction_list (transaction_list_id, user_id,	transaction_id)
            VALUES(?, ?, ?)`;
  // console.log(params);
  let rows = await executeSQL(sql, params);
  // console.log(rows);
  res.render('success');
    
  } catch (error) {
    res.render('failure');
  }
}); // api create transaction list

app.get(api_base+'/create_user_list/*', logger, async (req, res) => {
  try {
  /**
  * I made the variables in this the uri names
  * but without vowels in order to distinguish them.
  */
    // card_id	card_num	expiration	cvv	holder_name	zip	card_nickname
  let owner_id = req.query.oid;
  let other_user_id = req.query.otheruid;
  
  let params = [owner_id, other_user_id];
  let sql = `INSERT INTO user_list (owner_id,	other_user_id, is_accepted)
            VALUES(?, ?, 0)`;
  // console.log(params);
  let rows = await executeSQL(sql, params);
  // console.log(rows);
  res.render('success');
    
  } catch (error) {
    res.render('failure');
  }
}); // api create user list

// all retrieves

app.get(api_base+'/retrieve_card_list/*', logger, async (req, res) => {
  try {
    let sql = `SELECT * FROM card_list WHERE card_list_id=${req.query.clid}`;
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve card list

app.get(api_base+'/retrieve_card_lists', logger, async (req, res) => {
  try {
    let sql = "SELECT * from card_list order by card_list_id asc";
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all card lists

app.get(api_base+'/retrieve_transaction_list/*', logger, async (req, res) => {
  try {
    let sql = `SELECT * FROM transaction_list WHERE transaction_list_id=${req.query.tlid}`;
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve card list

app.get(api_base+'/retrieve_transaction_lists', logger, async (req, res) => {
  try {
    let sql = "SELECT * from transaction_list order by transaction_list_id asc";
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all transaction lists

app.get(api_base+'/retrieve_user_list/*', logger, async (req, res) => {
  try {
    let sql = `SELECT * FROM user_list WHERE owner_id=${req.query.ulid}`;
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve user list

app.get(api_base+'/retrieve_user_lists', logger, async (req, res) => {
  try {
    let sql = "SELECT * from user_list order by owner_id asc";
    let rows = await executeSQL(sql);
    res.render('retrieve', { "data": rows });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all user lists

app.get(api_base+'/retrieve_lists', logger, async (req, res) => {
  try {
    let sql1 = "SELECT * from card_list order by card_list_id asc";
    let rows1 = await executeSQL(sql1);
    let sql2 = "SELECT * from transaction_list order by transaction_list_id asc";
    let rows2 = await executeSQL(sql2);
    let sql3 = "SELECT * from user_list order by owner_id asc";
    let rows3 = await executeSQL(sql3);
    res.render('retrieve_all', { "data1": rows1, "data2": rows2, "data3": rows3 });
    
  } catch (error) {
    res.render('failure');
  }
}); // api retrieve all lists

// end retrieves

// all updates
app.get(api_base+'/update_card_list/*', logger, async (req, res) => {
  try {
  let card_list_id = req.query.clid;
  let card_id = req.query.cid;
  
  let params = [card_id, card_num];
  
  let sql = `UPDATE card_list SET card_id='${card_id}' WHERE card_list_id='${card_list_id}';`;
  let rows = await executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user_list

app.get(api_base+'/update_transaction_list/*', logger, async (req, res) => {
  try {
  let transaction_list_id = req.query.tlid;
  let user_list_id = req.query.uid;
  let transaction_id = req.query.tid;
  
  let params = [transaction_list_id, user_list_id, cvv];
  
  let sql = `UPDATE transaction_list SET user_list_id='${user_list_id}', transaction_id='${transaction_id}' WHERE transaction_list_id='${transaction_list_id}';`;
  let rows = await executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user_list

app.get(api_base+'/update_user_list/*', logger, async (req, res) => {
  try {
  let owner_id = req.query.oid;
  let other_user_id = req.query.otheruid;
  let isacc = req.query.isaccept;
    
  let sql = `UPDATE user_list SET other_user_id=${other_user_id}, is_accepted=${isacc} WHERE owner_id=${owner_id}`;
    
  executeSQL(sql);
  // res.render('createReview', { "brands": rows });
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api update user_list

// end updates

// all deletes

app.get(api_base+'/delete_card_list/*', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM card_list WHERE card_list_id=${req.query.clid}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user_list

app.get(api_base+'/delete_transaction_list/*', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM transaction_list WHERE transaction_list_id=${req.query.tlid}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user_list

app.get(api_base+'/delete_user_list/ocid', logger, async (req, res) => {
  try {
    let sql = `DELETE FROM user_list WHERE owner_id=${req.query.oid}`;
    let rows = await executeSQL(sql);
  res.render('success');
  } catch (error) {
    res.render('failure');
  }
}); // api delete user_list

// end deletes

/** END OF LISTS API*/

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