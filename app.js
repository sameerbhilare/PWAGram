const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const postRoutes = require('./routes/post-routes');
const subscriptionRoutes = require('./routes/subscription-routes');

const app = express();

// connect to the database
mongoose
  .connect(process.env.DATABASE)
  .then(() => {
    console.log('Connected !');
  })
  .catch(() => {
    console.log('Connection Failed.');
  });

/*
  request.secure doesn't work in the first place because Heroku acts as a proxy, 
  which kind of redirects and modifies incoming requests.
  So we need to trust the proxies. For this, express has built in support for this kind of situations.
*/
app.enable('trust proxy');

/****************************************************
 * GLOBAL MIDDLEWARES
 */
// 1) implement cors
// cors() returns a middleware function which will add a couple of different headers to our response.
// We could add these headers manualy by ourselves without using this package but why reinvent?
// this works for simple requests only - GET, POST
app.use(cors());

// 2) implement cors for non-simple requests
// handling for non-simple requests like delete, patch, etc.
// here we need to handle OPTIONS http method just like app.get() for GET method
// we need to define the route for which we want to handle the OPTIONS requests.
// app.options('*', cors());

// parser body
app.use(bodyParser.json()); // for json body
app.use(bodyParser.urlencoded()); // for url encoded body (html form)

// static files
//app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/', express.static(path.join(__dirname, 'public')));

app.use('/api/posts', postRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

/*
app.use('/api/posts', (req, res, next) => {
  console.log('posts');
  res.status(200).json([
    {
      id: '60365cdcd73cc72c80003abc',
      title: 'White Turf zzz',
      location: 'St. Moritz zzz',
      image: 'http://localhost:3000/src/images/white-turf-st-moritz.jpg',
    },
  ]);
});
*/

// routes
// pages
// app.use('/help', (req, res, next) => {
//   console.log('help');
//   res.sendFile(path.join(__dirname, '../public/help', 'index.html'));
// });
// app.use('/', (req, res, next) => {
//   console.log('home');
//   res.sendFile(path.join(__dirname, '../public', 'index.html'));
// });

module.exports = app;
