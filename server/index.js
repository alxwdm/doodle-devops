/**
 * This is the backend for the React app on:
 * https://codesandbox.io/s/brave-murdock-ck6of?file=/src/App.js
 */
var express = require("express");
var path = require("path");
var app = express();
var cors = require("cors");
app.use(cors());

const port = 4000;

/*
var corsOptions = {
  origin: "https://ck6of.csb.app/",
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
*/

app.use(express.static(path.join(__dirname, "build")));

//Valerie
app.use('/model', express.static('tfjs_model'));

/*
app.use(
  "/model",
  express.static(path.join(__dirname, "tfjs_model/model.json"))
);

// this is required to get access to the shards
app.use(
  "/model",
  express.static(path.join(__dirname, "tfjs_model/"))
);
*/
/*
app.get("/ping", cors(corsOptions), function(req, res) {
  return res.send("pong");
});

app.get("/", cors(corsOptions), function(req, res) {
  res.send("Visit app at: https://ck6of.csb.app/");
});
*/

app.listen(port, () =>
  console.log('Express server listening at http://localhost:${port}')
);

