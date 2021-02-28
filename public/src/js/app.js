var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

// check if browser supports Promise, if not then use promise.js polyfill
if (!window.Promise) {
  window.Promise = Promise; // this 'Promise' is from promise.js polyfill
}

/*
    Check if the browser supports Service worker. 
    navigator is simply your browser.
    (checks if the navigator object has 'serviceWorker' property)
*/
if ('serviceWorker' in navigator) {
  // register the service worker.
  // sw.js file should be registered as a service worker, as a background process.
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => {
      console.log('Service Worker Registered!');
    })
    .catch((err) => {
      console.err('Could not register Service Worker. Error =>', err);
    });
} else {
  console.log('Service worker is not supported!');
}

/*
  Deferring Install Prompt: 
  Starting with Chrome version 68, Chrome will not automatically shows an "App Install Banner". 
  You instead have to listen to a 'beforeinstallprompt' event and then show the banner manually.
  This event is fired by Chrome right before it's about to show that install banner.
*/
// 'beforeinstallprompt' event
window.addEventListener('beforeinstallprompt', (event) => {
  console.log('beforeinstallprompt fired ...', event);
  // Prevent the mini-infobar from appearing on mobile
  event.preventDefault();
  // Stash the event so it can be triggered later.
  // we are using this stashed event 'deferredPrompt' in the feed.js openCreatePostModal() function
  // as we want to show the Install Banner on click of  Add Post (+) button on main page.
  deferredPrompt = event;
  // don't do anything.
  return false;
});

/*
  Show 'Enable Notifications' button if browser supports it.
*/
if ('Notification' in window && 'serviceWorker' in navigator) {
  for (var i = 0; i < enableNotificationsButtons.length; i++) {
    enableNotificationsButtons[i].style.display = 'inline-block';
    enableNotificationsButtons[i].addEventListener('click', askForNotificationPermission);
  }
}

/*
  Theoretically if we want to display a notification, the browser will automatically prompt the user.
  But it's better if we do it manually which allows us to handle the user response 
  and of course control when we in the end ask for it.

  If the user block permissions, we can't even ask again. 
  If it permission requested is just undecided and user closed the tab or something like that, 
  he'll get asked next time again but nothing more we can do.
  So we should try to pick the best possible point of time for asking the permission.
*/
function askForNotificationPermission() {
  Notification.requestPermission((result) => {
    console.log('User Choice', result);
    if (result !== 'granted') {
      console.log('No Notification Permission granted!');
    } else {
      // we are good to display notifications :)
      // You can hide the 'Enable Notifications' button if you want.
      // displayConfirmNotification(); // just for testing here

      // configure push subscriptions
      configurePushSub();
    }
  });
}

// configure push subscriptions
function configurePushSub() {
  // always check for feature availability
  if (!('serviceWorker' in navigator)) {
  }

  /*
    subscriptions are managed by the service worker 
    because it's the service worker which is also responsible for reacting to push messages later on.
    A subscription is a combination of browser and device.
  */
  var reg;
  navigator.serviceWorker.ready
    .then((swReg) => {
      reg = swReg;
      // access the push manager and check for existing subscriptions.
      // Does THIS service worker handled through THIS browser have an existing subscription for THIS device?
      return swReg.pushManager.getSubscription(); // checks internlly and returns a promise
    })
    .then((sub) => {
      console.log('Existing sub', sub);
      if (sub === null) {
        // create new subscription
        /*
          This create a new subscription for the given browser on this device.
          If we have an existing subscription, it will render the old one useless.
          A subscription contains the endpoint of that browser vendor server to which we push our push messages,
          anyone with this endpoint can send messages to that server and this server will forward them to our web app.

          The security mechanism is that we will identify our own application server / our own back-end server 
          as the only valid source sending you push messages, 
          so that anyone else sending push messages to the API endpoint by the browser vendor server will simply not get through.          

          Now to identify our own application server, passing just the IP or something like that certainly isn't enough 
          because that's easy to trick and not really secure.
          So for that we can use VAPID.
          We use vapid keys to protect our push messages and make sure we only send them from our application server and no one else can send them.
        */
        var vapidPublicKey =
          'BA8Vh7nGbKi85yoYWtcj6D5BxDhoeLl4wlphcuwo7JGAFKE7DW8EtPL7SrGOW7geIl_T0YYt4m7JCM4ZYyOuTX8';
        var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
        return reg.pushManager.subscribe({
          userVisibleOnly: true, // push notifications sent through our service are only visible to this user.
          applicationServerKey: convertedVapidPublicKey,
        });
      } else {
        // we have a subscription
      }
    })
    .then((newSub) => {
      console.log(newSub);
      if (newSub) {
        // store the subscription on the server
        return fetch('/api/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(newSub),
        });
      }
    })
    .then((response) => {
      if (response.ok) {
        displayConfirmNotification();
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

// function to display a notification
function displayConfirmNotification() {
  var options = {
    body: 'You have successfully subscribed to our Notification Service. Thank you.', // body
    icon: '/src/images/icons/app-icon-96x96.png', // to display icon in our notification
    //image: '/src/images/white-turf-st-moritz.jpg', // an image - this will be part of the content
    dir: 'ltr',
    lang: 'en-US', // bcp47 compliant language code
    /* To specify your own vibration pattern for this notification (if supported by device)
       to be clear about how it should vibrate.
       [100, 50, 200] vibrate for 100 ms, pause for 50ms and vibrate again for 200ms */
    vibrate: [100, 50, 200],
    /* badge is what's showing up in the notification bar. Available for Android.
       The cool thing is you can pass a normal icon, you don't have to create a black and white one 
       and Android will automatically mask it for you.
       For desktop chrome, it will be displayed at the top left corner just before your app name.
    */
    badge: '/src/images/icons/app-icon-96x96.png', // recommended resolution by Google for Android.
    tag: 'confirm-notification', // to assign a tag to your notification.
    /* renotify if set to true makes sure that even if you use the same tag, 
       a new notification will still vibrate and alert the user. 
       If it's set to false and you use the same tag on notifications, 
       new notifications of the same tag actually won't vibrate the phone again 
       and won't notify the user again. Renotify is used along with tag.
    */
    renotify: true,
    // actions - are the buttons displayed next to your notification. We can also listen to these actions.
    actions: [
      { action: 'confirm', title: 'Okay', icon: '/src/images/icons/app-icon-96x96.png' },
      { action: 'cancel', title: 'Cancel', icon: '/src/images/icons/app-icon-96x96.png' },
    ],
  };
  // to show the notification via normal JavaScript
  /*
  // 1. simple notification
  new Notification('You have successfully subscribed! :)');
  // 2. Notification with a body
  new Notification('You have successfully subscribed! :)', options);
  */

  // Show notifications via Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((swReg) => {
      // getting access to the active service worker
      swReg.showNotification('You have successfully subscribed!', options); // title and options
    });
  }
}

/*
// ===========================
// creating promise
var promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    if (true) {
      // make it false to test 'reject' flow
      resolve('equal');
    } else {
      reject('not equal');
    }
  }, 2000);
});

// consuming promise
promise
  .then((result) => {
    console.log('Promise', result);
  })
  .catch((err) => console.log('Promise', err));

// ===========================
// using fetch to GET
fetch('http://httpbin.org/ip')
  .then((response) => {
    console.log(response);
    // It is an asynchronous operation though because it gets a readable stream
    return response.json();
  })
  .then((data) => {
    console.log('fetch', data);
  })
  .catch((err) => {
    console.log('fetch', err);
  });

// ===========================
// using fetch to POST
fetch('http://httpbin.org/post', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  mode: 'cors', // response has to include the cors headers
  body: JSON.stringify({
    // since we are setting content type to json, we need to stringigy this JS object
    message: 'This is test message',
  }),
})
  .then((response) => {
    console.log('fetch', response);
    // It is an asynchronous operation though because it gets a readable stream
    return response.json();
  })
  .then((data) => {
    console.log('fetch', data);
  })
  .catch((err) => {
    console.log('fetch', err);
  });

// ===========================
// using AJAX
var xhr = new XMLHttpRequest();
xhr.open('GET', 'http://httpbin.org/ip');
xhr.responseType = 'json';

xhr.onload = function () {
  console.log('ajax', xhr.response);
};

xhr.onerror = function () {
  console.log('ajax error');
};

xhr.send();
*/
