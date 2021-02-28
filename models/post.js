const mongoose = require('mongoose');

// schema is blueprint of how the Post object will look like
const postSchema = mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  rawLocationLat: { type: Number, required: false, default: 0 },
  rawLocationLng: { type: Number, required: false, default: 0 },
  image: { type: String, required: true },
});

module.exports = mongoose.model('Post', postSchema); // collection name will be 'posts'
