/**************

USAGE: nodejs bot.js -d <working-dir> -n <number-of-actors>

**************/
var imdbscraper = require('./lib/imdbscraper'),
    logger = require('./lib/logger'),
    names = require('./names.json');

logger.debugLevel = 'debug';

var bot = new imdbscraper();

bot.setNames(names);
bot.setWorkingDir(__dirname + '/workingdir');
bot.downloadActorImagesBornToday(5);


console.log("done " + __dirname);
