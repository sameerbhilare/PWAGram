const mongoose = require('mongoose');
const Post = require('../models/post');
const webPush = require('web-push');
const Subscription = require('../models/subscription');

exports.createPost = (req, res, next) => {
  const url = req.protocol + '://' + req.get('host');
  const post = new Post({
    title: req.body.title,
    location: req.body.location,
    rawLocationLat: req.body.rawLocationLat,
    rawLocationLng: req.body.rawLocationLng,
    image: url + '/src/images/' + req.file.filename, // added by multer
  });
  // save to DB
  post
    .save()
    .then((createdPost) => {
      // now the web push package has all the information it needs to send a new push request.
      webPush.setVapidDetails(
        `mailto:${process.env.EMAIL_ID}`,
        process.env.WEB_PUSH_PUBLIC_KEY,
        process.env.WEB_PUSH_PRIVATE_KEY
      );
      // send a push request to all our subscriptions.
      Subscription.find().then((subscriptions) => {
        if (subscriptions) {
          subscriptions.forEach((sub) => {
            const pushConfig = {
              endpoint: sub.endpoint,
              keys: {
                auth: sub.keys.auth,
                p256dh: sub.keys.p256dh,
              },
            };
            // send actual notification to each subscription
            webPush
              .sendNotification(
                pushConfig,
                JSON.stringify({
                  title: 'No Post!',
                  content: 'New Content Added',
                  image: createdPost.image,
                  openUrl: '/help',
                })
              )
              .catch((error) => {
                console.log('Error while sending push notification.', error);
              });
          });
        }
      });
      res.status(201).json({
        message: 'Post added successfully!',
        post: {
          ...createdPost,
          id: createdPost._id,
        },
      });
    })
    .catch((error) => {
      console.log('createPost', error);
      res.status(500).json({
        message: 'Creating a Post failed!',
      });
    });
};

exports.getPost = (req, res, next) => {
  // fetch all posts from DB
  Post.findById(req.params.id)
    .then((post) => {
      if (post) {
        res.status(200).json(post);
      } else {
        res.status(404).json('Post Not Found !');
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: 'Some problem while getting the Post!',
      });
    });
};

exports.getPosts = (req, res, next) => {
  let findQuery = Post.find();

  let fetchedPosts;
  // fetch all posts from DB
  findQuery
    .then((posts) => {
      fetchedPosts = posts.map((p) => {
        return {
          id: p._id,
          title: p.title,
          location: p.location,
          image: p.image,
          rawLocationLat: p.rawLocationLat,
          rawLocationLng: p.rawLocationLng,
        };
      });
      return Post.count();
    })
    .then((count) => {
      res.status(200).json({
        message: 'Posts Fetched successfully',
        posts: fetchedPosts,
        totalPosts: count,
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        message: 'Fetching the Posts failed!',
      });
    });
};
