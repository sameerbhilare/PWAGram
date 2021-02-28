/*
    The scope by default always is the folder the service worker sits in. 
    So if we add it to the /js folder, the service worker will only apply to HTML pages inside that folder. 
    (Here /js is a wrong place as it will not have any html pages, but will have only .js files.)

    We typically add the service worker file in the root folder 
    so that it applied to all HTML pages in the application. E.g. /public.

    Service workers are running in the background and are all about handling events.
    Therefore, we always attach event listeners to the service worker, we simply react to events.

    'self' basically means please give me access to the service worker so to this background process.
    Here we don't have access to DOM events as service workers don't have access to DOM itself.
*/

/*
  By default in service worker, we can access files from main project 
  because the service worker doesn't care about which polyfills or packages we load in our main project 
  but service workers have a special syntax which allow us to import other packages using 'importScripts'.
  This simply allows us to point to another script which we want to use in that service worker 
  and this in general allows you to distribute your code across multiple files.
  You can of course also use this to make your service worker leaner and outsource some of the code into a separate file,
*/
importScripts('/src/js/idb.js');
importScripts('/src/js/idb-utility.js'); // sequence matters as we need 'idb' first

var CACHE_STATIC_NAME = 'static-v3';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';
var MAX_ITEMS_IN_DYNAMIC_CACHE = 20;

var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html', // this is the default offline fallback page
  '/src/js/app.js',
  '/src/js/idb-utility.js',
  '/src/js/material.min.js',
  '/src/js/feed.js',
  '/src/js/idb.js', // to access it offline for easy access.
  '/src/js/promise.js', // not required for browsers supporting SW. See above comment for details.
  '/src/js/fetch.js', // not required for browsers supporting SW. See above comment for details.
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/sam-main.png', // only this image because this is the only static image used in /index.html page
  'https://fonts.googleapis.com/css?family=Roboto:400,700', // CDN Font
  'https://fonts.googleapis.com/icon?family=Material+Icons', // CDN icons
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
];

/*
  Cleaning / Trimming cache
  maxItemm - number of max items allowed in cache.
*/
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    // returns requests as keys
    return cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        // means we have more items in the cache then max allowed
        // delete oldest item and recuresively call this same function till cache size stays in limit
        cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
      }
    });
  });
}

// ======================================================
// LIFE CYCLE EVENTS
// ======================================================

// 'install' event when browser installs the service worker.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker ...', event);

  // During 'install' event, we should be precaching the App Shell i.e. the static content.
  /*
    If it already exists, it will open it.
    If you try to open a cache which does not exist yet, it will create it.
    event.waitUntil() waits until caches.open (which returns a promise) is finished.

    Why should we use event.waitUntil()?
    Remember in a service worker, we work with asynchronous code because it's running in the background
    and it's event driven. Therefore the install event doesn't wait for cache.open to finish by default
    (as it returns promise). It would just see install event, trigger this operation and continue.
    And this can lead to huge problems because once the service worker installation finishes,
    you might have a fetch listener, you do fetch a resource and you try to get it from the cache
    even though your caching operation hasn't finished yet.
    So this can lead to problem. Hence use event.waitUntil
  */
  event.waitUntil(
    // 'caches' refers to overall Cache Storage. You can give any name for your static cache.
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      // caches.open() returns a reference to the cache so that we can add content/files to this cache
      console.log('[Service Worker] Precaching App Shell.');

      /*
        PRE-CACHING / STATIC CACHING -
        Make a request to given file, download it and stores both 'request' and 'response' values in the cache.
        Think of these as 'requests' not paths.
        Just cachig '/index.html' is not enough, we have to also cache '/'
        because we enter http://localhost:8080 in the URL which behind the scenes returns index.html page.
        Hence we must cache the 'request' for '/' in addition to the 'request' for '/index.html'

        We need the polyfills promise.js and fetch.js for legacy browsers
        but those browsers won't support service workers anyways, so there's no value in storing these files.
        However since these files are also referenced in the index.html,
        we can precache those as they will anyway be loaded since they are part of index.html

        We are not pre-caching /html/index.html and /src/css/help.css because we want to cache only bare minimum.
        We want to store the bare minimum app shell so as to make our first page run.

        For the icons, you don't really need to pre-cache those.
        Yes, you won't be able to add it to the homescreen if you don't pre-cache the icons
        but that shouldn't be an issue because offline support shouldn't be the permanent state of our application.

        We also need to precache the things we get from CDNs, like the styling package or the fonts
        and image icon sets which are referenced in the /index.html.
        One important restriction though - if you don't want to get an error while fetching from CDNs,
        the CDN servers you are pre-caching from should set the CORS headers to allow cross-origin-access to these files.
        If they don't, this will throw an error.
        */
      cache.addAll(STATIC_FILES);
    })
  );
});

// 'activate' event when the installed service worker is activated.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker ...', event);

  /*
    Old Cache Cleanup.
    Using event.waitUntil here to again wait until we're done with the clean up before we continue 
    because we're doing some work on the cache and if we don't wait for this to finish, 
    we might react to a fetch event and serve that from the old cache which we're about to tear down.
  */
  event.waitUntil(
    // caches.keys() returns keys of all the sub-caches in your cache storage.
    caches.keys().then((keySet) => {
      // Promise.all() takes an array of promises and waits for all of them to finish,
      // so that we only return from this function once we're really done with the cleanup.
      return Promise.all(
        // transform this array of strings into an array of promises (to delete given cache).
        keySet.map((key) => {
          // we want to delete old caches only.
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing Old Cache: ', key);

            // returns a promise to delete given cache from cache storage
            return caches.delete(key);
          }
        })
      );
    })
  );

  /*
    Below line basically ensures that the service workers are loaded or are activated correctly. 
    It should work without that line but it can fail from time to time or behave strangely.
    Adding this line simply makes it more robust, might not be needed in the future.
  */
  return self.clients.claim();
});

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) {
    // request targets domain where we serve the page from (i.e. NOT a CDN)
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

// ======================================================
// NON-LIFE CYCLE EVENTS
// ======================================================
// 'fetch' event will get triggered whenever our web application fetches something.
/* ====================================
  fetch event will be emitted when the HTML pages for example load assets like the scripts 
  or like our CSS code through links or when they load an image thru <img> tag.
  It will also trigger if we manually send a fetch request in the app.js file.

   Parsing the request url to use different strategy for different urls
*/
self.addEventListener('fetch', (event) => {
  var url = '/api/posts';

  if (event.request.url.indexOf(url) > -1) {
    // =============================================================
    /*
      Use "Cache then Network" strategy for the urls which are initiated from normal javascript
      with "Cache then Network" strategy. e.g. here above 'url' is initiated from feed.js            
    */

    /* 
      Stragegy: Cache then Network

      With this in place, 
      We're making sure that we do reach out to the cache first (in the feed.js). 
          If the item is there, we display it immediately.
      We also make a network request SIMULTANEOUSLY (in the feed.js).
          Once the response is back from the network, 
          If it's a valid response, we store it in the cache here in service worker's 'fetch' event.
          If it's not, we don't do anything with it.
          But then we still have something served from the cache (code in feed.js). 
          If we don't have it in the cache and we can't get it from the network, well there's nothing we can do.
    */
    event.respondWith(
      caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
        return fetch(event.request).then((fetchedResponse) => {
          // store the response in IndexedDB and not in the cache storage
          var clonedResponse = fetchedResponse.clone();
          // clear the data fom indexedDB -
          // this will solve the problem of - what is data is actually deleted at server side. i.e. Firebase
          clearAllData('posts')
            .then(() => {
              return clonedResponse.json();
            })
            .then((data) => {
              // transform to array
              for (var key in data?.posts) {
                writeData('posts', data?.posts[key]);
              }
            });

          // return original response
          return fetchedResponse;
        });
      })
    );
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    // join all  static files with the word boundary operators (this basically means
    // we have separate words) and check if the URL matches this regular expression of separate words.

    // Using "Cache only" strategy for static assets. (It is perfectly fine, if we don't have this separate strategy.)
    event.respondWith(caches.match(event.request));
  } else {
    // =============================================================
    // otherwise use our old strategy of Cache with network fallback
    event.respondWith(
      // match() will have a look for given 'request' at ALL our sub-caches and see if we find a given resource there.
      // Note - the key in the cache is always a 'request' not a string.
      caches.match(event.request).then((cachedResponse) => {
        // even if match() doesn't find a match, it resolves. i.e. the 'response' will be null
        if (cachedResponse) {
          // returning value from the cache
          return cachedResponse;
        } else {
          // if not found in cache, then continue. i.e. make a network request
          // DYNAMIC CACHING - fetch resource from server and store it in the cache, dynamically.
          return fetch(event.request)
            .then((fetchedResponse) => {
              // you can give any name for your dynamic cache.
              // calling return as we are returning fetchedResponse below
              return caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
                /*
                  For the response, if we store it in cache, it is basically consumed which means it's empty.
                  This is how responses work. You can only consume/use them once
                  and storing them in the cache uses the response.
                  So we should store the cloned version of response
                */
                // trim cache before storing new items - commenting out
                // trimCache(CACHE_DYNAMIC_NAME, MAX_ITEMS_IN_DYNAMIC_CACHE);
                cache.put(event.request.url, fetchedResponse.clone());

                // return response
                // otherwise first request(actual network all) will fail, though the response will be cached
                //           and on next request content will be served from cache.
                return fetchedResponse;
              });
            })
            .catch((err) => {
              // Error will be thrown when user is offline and the requested page is not cached.
              // So here we should return the default offline fallback page.
              /*
                This of course has the side effect that if it's some request other than .html
                like us fetching some JSON from a URL we can't reach, we also return this default page
                We can fine tune this later.
              */
              return caches.open(CACHE_STATIC_NAME).then((cache) => {
                // "Routing": being able to look into the request URL and deciding what the best strategy is.
                // Here we want to show offline.html page if we are requesting .html pages, not available in above blocks
                // so if the incoming request accepts HTML
                // You can extend this feature to other parts like if you are expecting an image and as a fallback you could use a dummy image.
                if (event.request.headers.get('accept').includes('text/html')) {
                  return cache.match('/offline.html');
                }
              });
            });
        }
      })
    );
  }
});

/* 
    fetch event will be emitted when the HTML pages for example load assets like the scripts 
    or like our CSS code through links or when they load an image thru <img> tag.
    It will also trigger if we manually send a fetch request in the app.js file.

    Strategy: Cache with Network Fallback
*/
// self.addEventListener('fetch', (event) => {
//   //console.log('[Service Worker] Fetching something ...', event);

//   /*
//     Every outgoing fetch request goes through the service worker and so does every response.
//     event.respondWith() allows us to overwrite the data which gets sent back. Basically, we intercept the fetch request from browser.
//     We intercept this request and can return different things depending on whether we have online access,
//     if we have internet access or not. We'll then use respondWith to simply check the internet connection
//     basically and return stuff from our cache or from the network.
//   */

//   // event.respondWith(null); // don't do anything.Reload your app to see the behavior.

//   // this line as same as not having this line :) bcz this is what browser will anyway do, i.e. fetch the requested asset
//   // event.respondWith(fetch(event.request));

//   /*
//     In the fetch event listener of the service worker,
//     make sure we actually fetch the data from our cache if available.
//   */
//   event.respondWith(
//     // match() will have a look for given 'request' at ALL our sub-caches and see if we find a given resource there.
//     // Note - the key in the cache is always a 'request' not a string.
//     caches.match(event.request).then((cachedResponse) => {
//       // if match() doesn't find a match, it resolves. i.e. the 'response' will be null
//       if (cachedResponse) {
//         // returning value from the cache
//         return cachedResponse;
//       } else {
//         // if not found in cache, then continue. i.e. make a network request
//         // DYNAMIC CACHING - fetch resource from server and store it in the cache, dynamically.
//         return fetch(event.request)
//           .then((fetchedResponse) => {
//             // you can give any name for your dynamic cache.
//             // calling return as we are returning fetchedResponse below
//             return caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
//               /*
//                 For the response, if we store it in cache, it is basically consumed which means it's empty.
//                 This is how responses work. You can only consume/use them once
//                 and storing them in the cache uses the response.
//                 So we should store the cloned version of response
//               */
//               cache.put(event.request.url, fetchedResponse.clone());

//               // return response
//               // otherwise first request(actual network all) will fail, though the response will be cached
//               //           and on next request content will be served from cache.
//               return fetchedResponse;
//             });
//           })
//           .catch((err) => {
//             // Error will be thrown when user is offline and the requested page is not cached.
//             // So here we should return the default offline fallback page.
//             /*
//               This of course has the side effect that if it's some request other than .html
//               like us fetching some JSON from a URL we can't reach, we also return this default page
//               We can fine tune this later.
//             */
//             return caches.open(CACHE_STATIC_NAME).then((cache) => {
//               return cache.match('/offline.html');
//             });
//           });
//       }
//     })
//   );
// });

/* ===================================================================================
  Strategy: Cache Only
  Our page sends a fetch request. The service worker intercepts the request. 
  We then have a look at the cache and if we find a resource there, we return it to the page. 
  We totally ignore the network.
*/
/*
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // match() will have a look for given 'request' at ALL our sub-caches and see if we find a given resource there.
    // Note - the key in the cache is always a 'request' not a string.
    caches.match(event.request)
  );
});
*/

/* ===================================================================================
  Strategy: Network Only
  There we don't use the service worker at all, 
  instead the page sends a request to the network and we return that.
  Either you can remove this 'fetch' event listener or add below code.
*/
/*
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
*/

/* ===================================================================================
  Strategy: Network with Cache Fallback
*/
/*
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // no need to write then() block because if success, that will be returned.
    fetch(event.request)
      // Network with Cache Fallback: with dynamic caching.
      // (You can remove this then block if you don't want to use dynamic cache)
      .then((fetchedResponse) => {
        return caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
          cache.put(event.request.url, fetchedResponse.clone());
          return fetchedResponse;
        });
      })
      .catch((err) => {
        return caches.match(event.request);
      })
  );
});
*/

/*
  'sync' event will be executed whenever the service worker believes it reestablished connectivity 
  or if the connectivity was always there as soon as a new sync task was registered.
  So whenever the service worker thinks it has connectivity 
  and it has an outstanding synchronization task, it will trigger this event.
*/
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Syncing', event);
  // 'sync-new-post' is the tag registered in the feed.js
  if (event.tag === 'sync-new-posts') {
    console.log('[Service Worker] Syncing New Posts');
    // wait till the task is finished
    event.waitUntil(
      readAllData('sync-posts').then((dataArr) => {
        for (var data of dataArr) {
          var postData = new FormData(); // allows us to send form data to a back-end
          postData.append('id', data.id);
          postData.append('title', data.title);
          postData.append('location', data.location);
          postData.append('rawLocationLat', data.rawLocation.lat);
          postData.append('rawLocationLng', data.rawLocation.lng);
          postData.append('image', data.picture, data.id + '.png'); // image taken by the camera will be a png

          // send it to server
          fetch('/api/posts', {
            method: 'POST',
            body: postData,
          })
            .then((response) => {
              // once we successfully sent the data, we should delete it from the indexedDB
              if (response.ok) {
                deleteItemFromData('sync-posts', data.id);
              }
            })
            .catch((err) => {
              console.log('Error while syncing data.', err);
            });
        }
      })
    );
  }
});

/*
  The interaction/actions with the notification happens only in the Service Worker. 
  This is because a notification is a system feature. 
  It's not displayed in our web application, it's not HTML or something like that, 
  it's displayed by the operating system. 
  Hence the user may interact with it when our page isn't even opened. 
  Infact this is something service workers are about, they run in the background 
  and for example when using Chrome on Android, 
  you will get notifications even if your application is closed, even if the browser is closed.

  'notificationclick' is executed whenever the user clicks on some notification thrown by this service worker.
*/
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] notificationclick', event);
  // find out which notification and action was clicked.
  var notification = event.notification;
  var action = event.action;

  // we can open a specific page in our application when the user clicks on a notification
  console.log(notification);
  if (action === 'confirm') {
    // 'confirm' action is set in the displayConfirmNotification() by us.
    console.log('Confirm was clicked.');
    notification.close(); // close the notification
  } else {
    console.log(action);
    /*
      This should basically ensure that if we tap the notification, 
      we either load our application in a tab the user already had open, to not unnecessarily open a new one 
      or if the user didn't have our application open, maybe the whole browser was closed,
      we open a new tab, maybe even a new browser window with our application loaded.
    */
    // 'clients' refers to all windows or all browser tasks related to this service worker.
    clients
      .matchAll() // to get access to all
      .then((clientsArr) => {
        var client = clientsArr.find((c) => {
          console.log('==============', c.visibilityState);
          // this means we have open browser window
          return c.visibilityState === 'visible';
        });

        var openUrl = '/';
        // 'data' passed from server -> to 'push' event handler below
        // -> to the notification itself -> then accessed here in notificationclick event
        if (notification.data?.openUrl) {
          openUrl = notification.data.openUrl;
        }

        if (client) {
          client.navigate(openUrl); // the url to navigate to,
          client.focus();
        } else {
          // -> to the notification itself -> then accessed here in notificationclick event
          clients.openWindow(openUrl);
        }

        // close the notification
        notification.close();
      });
  }
});

/*
   Listen to the user closing a notification.
   close basically means that for example on Android or on any phone, you just swipe it away 
   or click the X or you close all notifications.
   On Mac there is a close button. 
   So You basically don't interact with it, you don't click on it, you just close it.
*/
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] notificationclose', event);
});

/*
  Listen to Push Messages
  The service worker is always running in the background at least on some devices 
  and we want to react to push messages when we don't have a web page open. 
  So the service worker is only place where we can listen to them.

  When do we get an incoming push message?
  Well if this service worker on this browser on this device has a subscription 
  to which this push message was sent.
  Each subscription is stored on the server and has its own endpoint 
  and therefore if we send a push message from the server to that subscription, 
  this service worker who created that subscription will receive it. 
  That's the reason why if you unregister a service worker, you won't get it.
*/
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Notification received', event);

  // retrieve any data which was sent with the push message.
  // if data not found, use a fallback
  var data = { title: 'New!', content: 'Something new happened!', openUrl: '/' };
  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  // show notification using this data
  var options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png', // to display icon in our notification
    image: data.image, //'/src/images/white-turf-st-moritz.jpg', // an image - this will be part of the content
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
    /* The data option is a useful option to pass some extra metadata, 
       data you can later use upon interaction with your notification to the notification 
       and you could pass any data you want, as many properties as you want. 
       Then we can access this in the notification. */
    data: {
      url: data.openUrl,
    },
  };

  /*
    The active service worker itself can't show the notification, 
    it's there to listen to events it's running in the background.
    That's why we have to get access to the registration of the service worker, 
    that is the part running in the browser.
    So it's the part which connects the service worker to the browser.
  */
  event.waitUntil(self.registration.showNotification(data.title, options));
});
