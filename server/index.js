// Express App Setup
var express = require("express");
var path = require("path");
var app = express();
var cors = require("cors");
app.use(cors());

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

/*
 Code example for serving a tfjs model into a React App:
 * https://codesandbox.io/s/brave-murdock-ck6of?file=/src/App.js
*/

app.use(express.static(path.join(__dirname, "build")));

app.use('/model', express.static('tfjs_model'));

// TODO: PG communication


app.listen(port, () =>
  console.log('Express server listening at http://localhost:${port}')
);

