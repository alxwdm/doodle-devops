// Express App Setup
var express = require("express");
var path = require("path");
const bodyParser = require("body-parser");
var cors = require("cors");
var axios = require("axios");

var app = express();
app.use(cors());
app.use(bodyParser.json());

// Port Setup
const port = 4000;

/*
Set train-test-split ratio
Each INSERT into the doodle db comes with a set "proposal".
During delta-training, this entry can be used as train/test split.
The proposal is determined by a split percentage and a random number.
For debugging/demo purposes, the train_ratio is set to 0.5.
In production, the train_ratio should be set to a range from 0.8 to 0.98
(depending on the amount of data that becomes available).
*/
const train_ratio = 0.5
const train_freq = 2
var insert_cnt = 0

// Postgres Client Setup
const keys = require("./keys");
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on("connect", () => {
  pgClient
    .query("CREATE TABLE IF NOT EXISTS \
            doodles (idx INT, pred INT, split VARCHAR(5), \
            insert_date DATE NOT NULL DEFAULT CURRENT_DATE, data NUMERIC[])")
    .catch((err) => console.log(err));
});

// Delta-Training function test
function trnsvr_test() {
    // increment insertion counter
  insert_cnt = insert_cnt + 1
  console.log("insertion counter is: ", insert_cnt) 
  if (insert_cnt > train_freq) {
    console.log("start training")
    // test trnsvr communication
    axios.get("http://trnsvr:5000/test")
      .then(function (res) {console.log(res.data)})
      .catch(function (err) {console.log(err)});
    // reset insertion counter
    insert_cnt = 0
  }
}

// Express route handlers

// static files
//app.use(express.static(path.join(__dirname, "build")));
app.use("/api/model", express.static("tfjs_model"));

// POST requests
app.post("/api/values/test", (req, res) => {
  res.send("Hi again");
  const index = req.body.index;
  console.log("server here");
  console.log(index);
});
app.post("/api/predict", (req, res) => {
  // get prediction results
  const cat_idx = req.body.category_idx;
  const pred_idx = req.body.predict_idx;
  const data = req.body.data;
  res.send("recieved prediction results");
  // determine set
  var set_split = "train"
  if (Math.random() < train_ratio)
    {
      set_split = "train";
    }
  else
    {
      set_split = "test";
    }
  // save doodle in database
  pgClient.query(
    "INSERT INTO doodles(idx, pred, split, data) VALUES($1, $2, $3, $4)",
    [cat_idx, pred_idx, set_split, data]
    ); 
  // delta training test
  trnsvr_test();
});

// GET requests
app.get("/api/tests", (req, res) => {
  res.send("Hi test");
});
app.get("/api/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from doodles");
  res.send(values.rows);
  console.log(values.rows);
});

// Start socket
app.listen(port, () =>
  console.log("Express server listening on port", port)
);
