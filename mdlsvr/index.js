// Express App Setup
var express = require("express");
var path = require("path");
const bodyParser = require('body-parser');
var cors = require("cors");

var app = express();
app.use(cors());
app.use(bodyParser.json());

// Port Setup
const port = 4000;

// Postgres Client Setup
const keys = require('./keys');
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on('connect', () => {
  pgClient
    .query('CREATE TABLE IF NOT EXISTS doodles (idx INT, pred INT, data NUMERIC[])')
    .catch((err) => console.log(err));
});

// Express route handlers

// static files
//app.use(express.static(path.join(__dirname, "build")));
app.use('/api/model', express.static('tfjs_model'));

// POST requests
app.post('/api/values/test', (req, res) => {
  res.send('Hi again');
  const index = req.body.index;
  console.log('server here');
  console.log(index);
});
app.post('/api/predict', (req, res) => {
  // get prediction results
  const cat_idx = req.body.category_idx;
  const pred_idx = req.body.predict_idx;
  const data = req.body.data;
  res.send('recieved prediction results');
  // log results
  console.log(cat_idx);
  console.log(pred_idx);
  console.log(data);
  console.log(typeof data);
  // save doodle in database
  pgClient.query(
    "INSERT INTO doodles(idx, pred, data) VALUES($1, $2, $3)", [cat_idx, pred_idx, data]
    ); 
});

// GET requests
app.get('/api/tests', (req, res) => {
  res.send('Hi test');
});

app.get("/api/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from doodles");
  res.send(values.rows);
  console.log(values.rows);
});

app.listen(port, () =>
  console.log('Express server listening on port', port)
);
