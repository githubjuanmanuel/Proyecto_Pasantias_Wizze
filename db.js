const mongoose = require('mongoose');
require('dotenv').config();

const mongo_uri = process.env.MONGO_CONNECTION;

if (!mongo_uri) {
    console.error("URI not define at env file");
    process.exit(1);
}

mongoose
  .connect(mongo_uri)
  .then(() => {
    console.log("Connected to mongoDB");
  })
  .catch((err) => {
    console.error(`Error connecting to mongoDB:`,err)
});

module.exports = mongoose; 