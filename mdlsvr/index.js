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
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

// Express route handlers

// static files
//app.use(express.static(path.join(__dirname, "build")));
app.use('/api/model', express.static('tfjs_model'));

// POST requests
app.post('/api/values', (req, res) => {
  res.send('Hi again');
  const index = req.body.index;
  console.log('server here');
  console.log(index);
});

// GET requests
app.get('/api/tests', (req, res) => {
  res.send('Hi test');
});

// TODO: PG communication

app.listen(port, () =>
  console.log('Express server listening at http://localhost:${port}')
);
