
//import { ErrorRequestHandler } from 'express';
import {app} from '../app.js';

var port : number = 0;
if(process.env.USE_CERTIFICATES == 1){
  port = normalizePort(process.env.PORT || '443');
} else if(process.env.USE_CERTIFICATES == 2) {
  port = normalizePort(process.env.PORT || '3003');
} else {
  port = normalizePort(process.env.PORT || '80');
}
if(port != -1){ 
  app.set('port', port);
}

/**
 * Create HTTP server.
 */

//var server = http.createServer(app);
import {server} from "../socket_connection.js";

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, '0.0.0.0', function(){
  console.log("Server is running on " + port);
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val : string) : number {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return -1;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return -1;
}

/**
 * Event listener for HTTP server "error" event.
 */

// ErrorRequestHandler (err: any, req: Request, res: Response, next: NextFunction)
function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
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
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
}
