const app = require('./app');
const debug = require('debug')('node-angular');
const http = require('http');

const normalizePort = (val) => {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  const bind = typeof port === 'string' ? 'pipe ' + port : 'port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  const bind = typeof port === 'string' ? 'pipe ' + port : 'port ' + port;
  debug('Listening on ' + bind);
};

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);
server.on('error', onError);
server.on('listening', onListening);
server.listen(port);


/*
  Heroku dynos restart every 24 hours in order to keep your app in a healthy state.
  And the way that Heroku does this is by sending the so-called SIGTERM signal to our node application, 
  and the application will then basically shut down immediately. So we should handleit gracefully.
*/
process.on('SIGTERM', () => {
  console.log('SIGTERM recevied. Shutting down gracefully...');
  // With server.close, we give the server, time to finish all the request
  // that are still pending or being handled at the time.
  server.close(() => {
    console.log('Process terminated!');
    // no need to call process.exit because SIGTERM itself will cause the applicationto shutdown
  });
});