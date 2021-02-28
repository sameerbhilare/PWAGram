const multer = require('multer');

const MIME_TYPES_MAP = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

// initialize multer storage - to store images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isValid = MIME_TYPES_MAP[file.mimetype];
    let error = null;
    if (!isValid) {
      error = new Error('Invalid mime type');
    }
    cb(error, `${__dirname}/../public/src/images`); // path relative to the server.js file
  },

  // this filename will be set be multer and will be available at req.file.filename
  filename: (req, file, cb) => {
    const name = file.originalname.toLowerCase().split(' ').join('-').replace(/:/g, '-');
    const ext = MIME_TYPES_MAP[file.mimetype];
    cb(null, name + '-' + Date.now() + '.' + ext);
  },
});

module.exports = multer({ storage: storage }).single('image');
