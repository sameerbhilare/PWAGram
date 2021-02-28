/*
  open an indexedDB database and also create an object store.
  'idb' object is accessible here because we have imported it above using importScripts()
*/
var DB_VERSION = 1;
// 'posts-store' database name
var dbPromise = idb.open('posts-store', DB_VERSION, (db) => {
  // this callback function will get executed whenever database is created
  // 'post' is object store like a table.
  if (!db.objectStoreNames.contains('posts')) {
    // create object store if one does not already exist
    db.createObjectStore('posts', {
      keyPath: 'id', // primary key to uniquely identidy each entry
    });
  }

  // Store for background sync task
  if (!db.objectStoreNames.contains('sync-posts')) {
    // create object store if one does not already exist
    db.createObjectStore('sync-posts', {
      keyPath: 'id', // primary key to uniquely identidy each entry
    });
  }
});

function writeData(storeName, data) {
  return dbPromise.then((db) => {
    // indexeddb works with transactions. We have to use it.
    // which store we want to target for this transaction - storeName
    // wihch kind of transaction is this - e.g. readwrite
    var tx = db.transaction(storeName, 'readwrite');
    // explictly open the store
    var store = tx.objectStore(storeName);
    // store data in database against 'id' key (defined above in 'keyPath' property)
    store.put(data);
    return tx.complete; // close the transaction. For every write operation, we need to return tx.complete.
  });
}

function readAllData(storeName) {
  return dbPromise.then((db) => {
    // every operation has to be wrapped in a transaction.
    var tx = db.transaction(storeName, 'readonly');
    // open the store
    var store = tx.objectStore(storeName);
    // here we don't need to call tx.complete because the transaction will complete
    // but we don't need to return that to indicate that we need it to succeed.
    // it's a get data operation, if it for some reason fails, we'd simply get back no data
    return store.getAll();
  });
}

function clearAllData(storeName) {
  return dbPromise.then((db) => {
    // every operation has to be wrapped in a transaction.
    var tx = db.transaction(storeName, 'readwrite');
    // open the store
    var store = tx.objectStore(storeName);
    // clear the store
    store.clear();
    return tx.complete; // close the transaction. For every write operation, we need to return tx.complete.
  });
}

// store name and id of the element we want to delete
function deleteItemFromData(storeName, id) {
  dbPromise
    .then((db) => {
      // every operation has to be wrapped in a transaction.
      var tx = db.transaction(storeName, 'readwrite');
      // open the store
      var store = tx.objectStore(storeName);
      // delete one item
      store.delete(id);
      return tx.complete; // close the transaction. For every write operation, we need to return tx.complete.
    })
    .then(() => {
      console.log('Item Deleted from IndexedDB', id);
    });
}

// this is an utility function. NOT related to IDB.
function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// convert the base64 URL to a blob/file.
function dataURItoBlob(dataURI) {
  var byteString = atob(dataURI.split(',')[1]);
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  var blob = new Blob([ab], { type: mimeString });
  return blob;
}
