// Express App Setup
var express = require("express");
var path = require("path");
const bodyParser = require("body-parser");
var cors = require("cors");
var axios = require("axios");
const fs = require("fs");
const util = require("util");
const stream = require("stream");
const pipeline = util.promisify(stream.pipeline);
const finished = util.promisify(stream.finished);

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
const train_every = 10
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

// Delta-Training function
async function delta_train() {
    // increment insertion counter
  insert_cnt = insert_cnt + 1
  console.log("insertion counter is: ", insert_cnt) 
  if (insert_cnt >= train_every) {
    // peform training and update weights
    console.log("starting training...")
    await axios.post("http://trnsvr:5000/train")
      .then(function (res) {console.log(res.data)})
      .catch(function (err) {console.log(err)});
    // update model
    console.log("updating model...")
    await update_weights().then(console.log('model updated.'))
    // reset insertion counter
    insert_cnt = 0
  }
}

// Update weights function
async function update_weights() {
  const writer = fs.createWriteStream("tfjs_model/group1-shard1of1.bin");
  return axios({
    method: "get",
    url: "http://trnsvr:5000/weights",
    responseType: "stream",
  }).then(response => {
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on("error", err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on("close", () => {
        if (!error) {
          resolve(true);
        }
        //no need to call the reject here, as it will have been called in the
        //'error' stream;
      });
    });
  });
}

// Express route handlers

// static files
//app.use(express.static(path.join(__dirname, "build")));
app.use("/api/model", express.static("tfjs_model"));

// POST requests
app.post("/api/values/test", (req, res) => {
  res.send("Hi again");
  const index = req.body.index;
  console.log("mdlsvr here");
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
  // delta-train if enough new data is available (train_freq) and update model
  delta_train()
});

// GET requests
app.get("/api/tests", (req, res) => {
  res.send("Hi test");
});
app.get("/api/test_txt", (req, res) => {
  file = axios.post("http://trnsvr:5000/test_file", {
    responseType: 'blob'
  })
      .then((response) => {
          fs.writeFile('tfjs_model/test.txt', response.data, (err) => {
              if (err) throw err;
              console.log('The file has been saved!');
          });
        /* For larger files:
          https://stackoverflow.com/questions/55374755/node-js-axios-download-file-stream-and-writefile/64925465#64925465
        */
      })
      .catch(function (err) {console.log(err)});
  console.log(file);
});
app.get("/api/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from doodles");
  res.send(values.rows);
});

// Start socket
app.listen(port, () =>
  console.log("Express server listening on port", port)
);
