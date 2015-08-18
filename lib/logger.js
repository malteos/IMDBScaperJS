var logger = exports;
logger.debugLevel = 'warn';
logger.log = function(level, message) {
    var levels = ['error', 'warn', 'info', 'debug'];
    //if (levels.indexOf(level) >= levels.indexOf(logger.debugLevel) ) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        };
        console.log(level+': ' + message);
    //}
};
logger.error = function(msg) { logger.log('error', msg); }
logger.warn = function(msg) { logger.log('warn', msg); }
logger.info = function(msg) { logger.log('info', msg); }
logger.debug = function(msg) { logger.log('debug', msg); }
