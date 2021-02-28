var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
// camera
var videoPlayer = document.querySelector('#player');
var canvasEle = document.querySelector('#canvas');
var captureBtn = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var picture;
// location
var locationBtn = document.querySelector('#location-btn');
var locationLoader = document.querySelector('#location-loader');
var maualLocationDiv = document.querySelector('#manual-location');
var fetchedLocation = { lat: 0, lng: 0 };

locationBtn.addEventListener('click', (event) => {
  if (!('geolocation' in navigator)) {
    return;
  }

  var sawAlert = false;

  // hide the button and show the loader
  locationBtn.style.display = 'none';
  locationLoader.style.display = 'inline';

  // get current position
  // calling getCurrentPosition() will prompt the user to grant permission.
  // if he denies it, the error callback will be executed.
  // if he accepts it, we will continue.
  // and in the future the user will not be prompted again unless he just skip the decision of course.
  navigator.geolocation.getCurrentPosition(
    // success callback
    (position) => {
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';
      console.log(position);
      // IMP: get both latitude and longitude.
      // Then yu can use Google Geolocation API to fetch location using these coordinates.
      fetchedLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      locationInput.value = 'In Mahabaleshwar';
      maualLocationDiv.classList.add('is-focused'); // this is required by the 3rd party library
    },
    // error callback
    (err) => {
      console.log(err);
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';
      if (!sawAlert) {
        sawAlert = true;
        alert('Could not fetch location. Please enter manually!');
      }
      fetchedLocation = { lat: 0, lng: 0 };
    },
    // options
    {
      timeout: 7000, // Timeout in ms, allows us to specify how long we try to get a location, a position.
    }
  );
});

function initializeLocation() {
  // check if browser supports geolocation api
  if (!('geolocation' in navigator)) {
    // doesn't support
    locationBtn.style.display = 'none'; // do not show location button
  }
}

// initialize the camera or the image picker depending on the features the given device supports.
// enable the camera in a progressive way, that it works on as many devices as possible
function initializeMedia() {
  /*
    Media devices is the API which gives us access to the device camera and also to the microphone.
    So all the media input a device can generate and that typically is audio or video, video includes images.
  */
  if (!('mediaDevices' in navigator)) {
    // if not supported, create a kind of polyfill to extend the support
    navigator.mediaDevices = {};
  }

  if (!('getUserMedia' in navigator.mediaDevices)) {
    /* 
     Polyfill/rebuilding the native get user media function
     if not supported, take advantage of older camera access implementations we used in the past.
     'constraints' means whether its audio or video.
     Actually some older or other browsers have their own native implementations 
     which pretty much do the same and we can bind them to this modern syntax 
     so that in the rest of our application, we can only use that modern syntax.
    */
    navigator.mediaDevices.getUserMedia = (constraints) => {
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia; // webkit for safari, moz for mozilla

      if (!getUserMedia) {
        // return rejected promise because the modern browsers which support getUserMedia return a promise
        // so our this custom implemention must return a promise.
        return Promise.reject(new Error('getUserMedia is not implemented.'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // at this point we have access to the getUserMedia API
  // Try to get access to the video on that device. So browser will ask for permission
  // if access granted, then then() block will be called, else catch() block will be called.
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      // 'stream' is video stream. Pass it onto our video DOM element
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch((err) => {
      // show fallback impage picker
      imagePickerArea.style.display = 'block';
    });
}

// capture button click to click a picture
/*
  The general idea is we'll get the stream of the video element, basically send it to the canvas
  and since the canvas is there to display static content, it will automatically take the latest snapshot 
  and just display that. Then we stop the video player and all we get is a canvas element with the 
  latest snapshot and we can then extract that simply from that canvas element.
*/
captureBtn.addEventListener('click', (event) => {
  canvasEle.style.display = 'block';
  videoPlayer.style.display = 'none'; // hide the video player
  captureBtn.style.display = 'none'; // hide the capture button

  // now get the stream onto the canvas
  var context = canvasEle.getContext('2d'); // draw 2d on the canvas
  // 0,0 are starting coordinates, canvas.width is allowed canvas width, height should fit video aspect ratio
  context.drawImage(
    videoPlayer, // note stream on the video is still ongoing even if set style.display none
    0, // starting X coordinate
    0, // starting Y coordinate
    canvas.width, // allowed canvas width
    videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width) // height should fit video aspect ratio
  );

  /*
    Now stop the stream in the video because otherwise it keeps on going even though we closed it 
    and if we keep this stream ongoing, the camera will stay on.
    If camera is on, you might see LED light pointing at you n laptop.
    So you definitely turn this off to both save resources and not scare your users.
  */
  // gives us access to all the running video streams on that element
  videoPlayer.srcObject.getVideoTracks().forEach((track) => {
    track.stop(); // stop each track. there will be only one in our case
  });

  /*
    Now The image in the canvas happens to be a base64 URL. 
    Theoretically we could upload that and store it in the database 
    but storing such long strings which are quite big in a size perspective too isn't really what you should do 
    in a database, instead we should store files on your file server.
    So we need to convert the canvas base 64 URL to a blob.
  */
  picture = dataURItoBlob(canvasEle.toDataURL()); // toDataURL() gives base64 representation of the canvas image
});

imagePicker.addEventListener('change', (event) => {
  picture = event.target.files[0];
});

function openCreatePostModal() {
  // createPostArea.style.display = 'block';
  // settimeout is just to make css aware that 'display' and 'transform' are 2 different steps
  // workaround for smooth animation
  // this animation wasn't good because closing the video player takes lots of resources
  setTimeout(() => {
    createPostArea.style.transform = 'translateY(0)';
  }, 1);

  initializeMedia();
  initializeLocation();
  // deferredPrompt is set in app.js
  if (deferredPrompt) {
    // show the App install banner.
    deferredPrompt.prompt();

    // check user's choice
    deferredPrompt.userChoice.then((choiceResult) => {
      console.log(choiceResult);
      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled the install.');
      } else {
        console.log('User added to home screen.');
      }
    });
  }

  // for testing only. This is not appropriate place to unregister a service worker.
  // unregisterServiceWorker();
}

/*
  Unregister Service Worker.
  You can call this function from appropriate place.
*/
function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister();
      }
    });
  }
}

function closeCreatePostModal() {
  // createPostArea.style.display = 'none';
  // cleanup
  imagePickerArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasEle.style.display = 'none';
  locationLoader.style.display = 'none';
  locationBtn.style.display = 'inline';
  captureBtn.style.display = 'inline';

  // stop the camera stream
  if (videoPlayer.srcObject) {
    /*
      Now stop the stream in the video because otherwise it keeps on going even though we closed it 
      and if we keep this stream ongoing, the camera will stay on.
      If camera is on, you might see LED light pointing at you n laptop.
      So you definitely turn this off to both save resources and not scare your users.
    */
    // gives us access to all the running video streams on that element
    videoPlayer.srcObject.getVideoTracks().forEach((track) => {
      track.stop(); // stop each track. there will be only one in our case
    });
  }
  // workaround for smooth animation
  // this animation wasn't good because closing the video player takes lots of resources
  setTimeout(() => {
    createPostArea.style.transform = 'translateY(100vh)';
  }, 1);
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

// Cache on Demand - Simulation
/*
function onSaveButtonClicked(event) {
  // first of all check if the browser supports 'caches'
  if ('caches' in window) {
    caches.open('user-requested').then((cache) => {
      // fetch from server and then add the request and response in the cache
      cache.add('https://httpbin.org/get'); // this is what is fetched in the card
      cache.add('/src/images/white-turf-st-moritz.jpg'); // this is requested in the card
    });
  }
}
*/

function clearCard() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url("' + data.image + '")';
  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.backgroundPosition = 'center'; // Or 'bottom'
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  // Cache on Demand - Simulation
  /*
  var cardSaveButton = document.createElement('button');
  cardSaveButton.textContent = 'Save';
  cardSaveButton.addEventListener('click', onSaveButtonClicked);
  cardSupportingText.appendChild(cardSaveButton);
  */
  cardWrapper.appendChild(cardSupportingText);
  componentHandler?.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
  clearCard(); // clear duplicate card if already added from cache below
  for (let i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
}

/* ==============================
 * Strategy: Cache then Network
   Belo code is for GET Request.
   For POST request, 
    use url => https://httpbin.org/post
    and change the fetch call to 
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: {
          message: JSON.stringify({ message: 'Some message' }),
        },)
 */
// added .json at the end as it is requirement from firebase
var url = '/api/posts';
// this flag is used to check if response from server is received before we could serve from cache.
// in that case, we should not use the cached response.
var serverResponseReceived = false;
fetch(url)
  .then(function (serverResponse) {
    return serverResponse.json();
  })
  .then(function (data) {
    serverResponseReceived = true;
    console.log('From Server', data?.posts);
    // convert JS object to array
    var dataArry = [];
    for (var key in data?.posts) {
      dataArry.push(data?.posts[key]);
    }
    updateUI(dataArry);
  });

/*
  In the service worker, we don't need check whether we have access to indexedDB 
  because in service workers, we have the access and we have already a check present if the browser supports Service worker itself.
  But here in the feed.js file, we might not have that access because maybe we're in a browser which doesn't support indexedDB.
*/
if ('indexedDB' in window) {
  readAllData('posts').then((dataArr) => {
    if (!serverResponseReceived) {
      console.log('From indexedDB', dataArr);
      updateUI(dataArr);
    }
  });
}

// fallback logic if Background sync is not supported by browser
function sendData() {
  var id = new Date().toISOString();
  var postData = new FormData(); // allows us to send form data to a back-end
  postData.append('id', id);
  postData.append('title', titleInput.value);
  postData.append('location', locationInput.value);
  postData.append('rawLocationLat', fetchedLocation.lat);
  postData.append('rawLocationLng', fetchedLocation.lng);
  postData.append('image', picture, id + '.png'); // image taken by the camera will be a png

  fetch('/api/posts', {
    method: 'POST',
    body: postData,
  }).then((res) => {
    console.log('Sent data', res);
    // convert JS object to array
    var dataArry = [];
    dataArry.push(res.post);
    updateUI(dataArry);
  });
}

form.addEventListener('submit', (event) => {
  // avoid page reload
  event.preventDefault();

  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert('Please enter valid data!');
    return;
  }

  // close modal
  closeCreatePostModal();

  /*
    SyncManager is basically the API through which we use the background synchronization features.
    check first if the browser supports 'SyncManager' and 'serviceWorker'
  */
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    /* 
      Make sure that serviceWorker has been configured, installed and activated
      and that it is ready to take some input.
      The reason why we are doing it here and not in Service Worker is 
      because the event which triggers the background synchronization set up happens in the feed.js file. 
      We can't listen to that event in the service worker because we can't listen to the form submission there.
      So this is the way we get access to service worker from normal javascript file.
    */
    navigator.serviceWorker.ready.then((sw) => {
      // wrap the data you want to sync
      var post = {
        id: new Date().toISOString(), // unique id
        title: titleInput.value,
        location: locationInput.value,
        picture: picture,
        rawLocation: fetchedLocation,
      };

      // save this data in the indexedDB so that we can fetch it in service worker for background sync
      // The reason we have to save it in indexedDB like this is SyncManager does not have inbuilt database.
      writeData('sync-posts', post)
        .then(() => {
          /*
          Register a synchronization task with the service worker for a specific 'tag' - here it is 'sync-new-post'.
          The input is an ID, a tag we can use to clearly identify a given synchronization task.
          We'll later use that in the service worker to react to re-established connectivity 
          and check which outstanding tasks we have and then we can use the tag to find out what we need to do with the task.
          */
          return sw.sync.register('sync-new-posts');
        })
        .then(() => {
          // after succesful background sync registration, show message to user (using material design lib)
          var snackbarContainer = document.querySelector('#confirmation-toast');
          var data = { message: 'Your post is saved for synching!' };
          snackbarContainer.MaterialSnackbar.showSnackbar(data);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  } else {
    // fallback logic if Background sync is not supported by browser
    sendData();
  }
});
