const mongoose = require("mongoose");

const placeSchema = mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    address: {
      type: String,
      require: true,
    },
    rating: {
      type: String,
      require: true,
    },
    description: {
      type: String,
      require: true,
    },
    type: {
      type: String,
      require: true,
    },
  },
  {
    timestimestamps: true
  }
);

const Place = mongoose.model("Place", placeSchema);

module.exports = Place;