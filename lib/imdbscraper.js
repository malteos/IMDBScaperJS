/*************
*
* Download actor photos from imdb.com
* - Born today
* - namePath
* - download photos
* - scrape bio
* - log names in names.json
**************/

var osmosis = require('osmosis'),
    dateFormat = require('dateformat'),
    sizeOf = require('image-size'),
    request = require('request'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    logger = require('./logger');

var IMDBScraper = module.exports = function IMDBScraper() {
    this.workingDir;
    this.names = {
        list: []
    };
    this.CONFIG = {
        minWidth: 800,
        minHeight: 800,
        minValidImages: 20,
    };
};


// -- Functions --
IMDBScraper.prototype.setNames = function(names) {
    this.names = names;
};

IMDBScraper.prototype.download = function(uri, filename, successCallback, errorCallback){
  request.head(uri, function(err, res, body){
  
// Do not test content-type, IMDB responses with text/html. !!!
//  if(res.headers['content-type'].indexOf("image/") === 0) {
    request(uri)
        .pipe(fs.createWriteStream(filename))
        .on('close', successCallback)
        .on('error', errorCallback);
//    } else {
//      logger.log('error', 'Error: Is not image content-type: ' + res.headers['content-type'] + '; ' + filename );
//    }
  });
};

// Returns number of valid images in directory (removes invalid images)
IMDBScraper.prototype.validateImages = function(directory) {
  var valid = 0;

  if(fs.existsSync(directory)) {
    var files = fs.readdirSync(directory);
    for(var i in files) {
      var file = directory + "/" + files[i];
      try {
        var dimensions = sizeOf(file);

        if(dimensions.width < this.CONFIG.minWidth && dimensions.height < this.CONFIG.minHeight) {
          fs.unlinkSync(file);
        } else {
          valid++;
        }
      } catch(e) {
        fs.unlinkSync(file);
      }
    }
  } else {
    logger.error('Directory does not exist: ' + directory);
  }
  return valid;
};

IMDBScraper.prototype.downloadActorImages = function(namePath, path, page, validImages) {
    var self = this;
    var minValidImages = self.CONFIG.minValidImages;
    var page = page ||  1;
    var invalidImages = invalidImages || 0;
    var validImages = validImages || 0;
    var start = validImages;

    logger.debug('Current page: ' + page + '; Valid images: ' + validImages + "; Min. valid images: " + minValidImages);

    request({
        url:  "http://m.imdb.com/_ajax" + namePath + "mediaindex?page=" + page +"&retina=false&maximagewidth=1440",
        json: true
    }, function (error, response, body) {

        if (!error && response.statusCode === 200) {
    //        console.log(body); // Print the json response
            var images = body.data;
            var totalPages = body.meta.total_pages;

            if(images.length < 1) {
                logger.error("Response is empty! Path: " + namePath + "; page: " + page + "; total pages: " + totalPages);
                logger.debug(body);
                return;
            }

            for(i=start; i < (start + images.length); i++) {
                var imgUrl = images[i-start].href;

                logger.info("Downloading (" + i + "/" + (start + images.length) + "): " + imgUrl);

                self.download(imgUrl,  path + i + ".jpg", function() {
                    //console.log("Downloaded: " + path + i + ".jpg");
                    validImages++;

                    if(validImages + invalidImages == images.length) {

                        logger.info("All requested images downloaded. Checking...");

                        if(validImages < minValidImages) {
                            logger.info("Need more valid images. " + validImages + "/" + minValidImages);

                            if(totalPages > page) {
                                self.downloadActorImages(namePath, path, page+1, validImages);
                            } else {
                                logger.info("No more pages...");
                            }
                        } else {
                            logger.info("Enough images: " + validImages);
                            var testedImages = self.validateImages(path);

                            if(testedImages < minValidImages) {
                              logger.info("Tested images result in " + testedImages + ". Need more images..");

                              if(totalPages > page) {
                                self.downloadActorImages(namePath, path, page+1, testedImages);
                              } else {
                                logger.info("No more pages...");
                              }
                            }
                        }

                    }
                }, function (err){
                    logger.log('error', 'Download failed: ' + imgUrl);
                    invalidImages++;

                    if(validImages + invalidImages == images.length) {
                        logger.log('info', 'All requested images downloaded.');
                    }
                })
            }
//            console.log("Valid images = " + validImages + " / " + images.length);
        } else {
            logger.log('error', 'Photo request failed. ResponseCode: ' + response.statusCode + '; Error: ' + error);
        }
    })
};

IMDBScraper.prototype.getNamePath = function(query, callback) {
    osmosis
        .get('http://m.imdb.com/find?q=' + decodeURIComponent(query))
        .set({
            'results[]': '.title a@href'
        })
        .data(function(data) {
            // starts with /name/
            for(i=0; i < data.results.length; i++) {
                if(data.results[i].substr(0, 6)  == "/name/") {
                    return callback(data.results[i]);
                }
            }
            logger.log('warn', 'No result for this query: ' + query);
    //        console.log(data.results);
        });
};

IMDBScraper.prototype.randomActorsBornToday = function(callback) {
    this.randomActorsBornAtDate(new Date(), callback);
};

IMDBScraper.prototype.randomActorsBornAtDate = function(date, callback) {
    request({
        url:  "http://m.imdb.com/feature/bornondate_json?today=" + dateFormat(date, "yyyy-mm-dd"),
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var results = [];
            for(i=0; i < body.list.length; i++) {
                results.push({
                    "name": body.list[i].title,
                    "namePath": body.list[i].url
                    });
            }
            callback(results);
        }
    });
};

IMDBScraper.prototype.actorBio = function(namePath, callback) {
    osmosis
        .get('http://m.imdb.com' + namePath + 'bio')
        .set({
            'name': 'h5 a',
            'bio': '#name-bio p'
        })
        .data(function(data) {
            callback(data);
        });
};


// Add names to log
IMDBScraper.prototype.addName = function(name) {
    this.names.list.push(name);

    fs.writeFile(__dirname + '/names.json', JSON.stringify(this.names, null, 4), function(err) {
        if(err) {
          logger.log('error', err);
        } else {
          logger.log('debug', "JSON saved to " + __dirname + '/names.json');
        }
    });
};

IMDBScraper.prototype.setWorkingDir = function(workingDir) {
    this.workingDir = workingDir;
};

IMDBScraper.prototype.getWorkingDir = function(name) {
    if(typeof this.workingDir !== 'string') {
        this.workingDir = __dirname;
    }

    // replace whitespaces with underscores
    return this.workingDir + "/" + name.replace(/\s/g, "_") + "/";
};

IMDBScraper.prototype.getImageDir = function(name) {
  return this.getWorkingDir(name) + "images/";
};

//getNamePath(name, function(namePath) {
//    console.log(namePath);
//    downloadActorImages(namePath, __dirname + "/images/" + name);
//});



IMDBScraper.prototype.downloadActorImagesBornToday = function(actorsLimit) {
    var self = this;
    var actorsLimit = actorsLimit || 1;
    var actorsCounter = 0;

    self.randomActorsBornToday(function(results) {
        for(i=0; i < results.length; i++) {

            if(self.names.list.indexOf(results[i].name) < 0) {
                // not exists
                var name = results[i].name;
                var namePath = results[i].namePath;

                if(!fs.existsSync(self.getWorkingDir(name))) {

                  logger.info(results[i].name + " - Downloading... - " + results[i].namePath);

                  // Create directories
                  mkdirp.sync(self.getWorkingDir(name));
                  mkdirp.sync(self.getImageDir(name));

                  self.downloadActorImages(namePath, self.getImageDir(name));
                  self.actorBio(namePath, function(res) {
                      //console.log(res);
                      fs.writeFile(self.getWorkingDir(name) + 'description.txt', res.bio, logger.error);
                      fs.writeFile(self.getWorkingDir(name) + 'title.txt', name, logger.error);
                  });
                } else {
                  logger.log('error', "Directory already exists." + self.getWorkingDir(name));
                }
                self.addName(name);
                actorsCounter++;

                if(actorsCounter >= actorsLimit) {
                    break;
                }

            } else {
                logger.log('warn', results[i].name + "  - EXISTS - " + results[i].namePath);
            }
        }

    })
};


