// Data manipulations module
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '/.data/');

const dataUtil = {
  init(filename, data, callback) {
    fs.open(`${dataDir}/${filename}.json`, 'wx', (err, fileDescriptor) => {
      if(!err && fileDescriptor){
        fs.writeFile(fileDescriptor, JSON.stringify(data), (err) => {
          if(!err) {
            fs.close(fileDescriptor, (err) => {
              if(!err) {
                // no errors creating a file
                callback(false);
              } else {
                callback('Error closing new file!');
              }
            });
          } else {
            callback('Error writing to new file!');
          }
        });
      } else {
        callback('Error creating new file!');
      }
    });
  },
  read(filename, callback) {
    fs.readFile(`${dataDir}/${filename}.json`, 'utf8', (err, data) => {
      callback(err, data)
    });
  },
  write(filename, data, callback) {
    fs.open(`${dataDir}/${filename}.json`, 'a', (err, fileDescriptor) => {
      if(!err && fileDescriptor){
        fs.appendFile(fileDescriptor, JSON.stringify(data), (err) => {
          if(!err) {
            fs.close(fileDescriptor, (err) => {
              if(!err) {
                // no errors writting to a file
                callback(false);
              } else {
                callback('Error closing file!');
              }
            });
          } else {
            callback('Error writing to file!');
          }
        });
      } else {
        callback('Error openning file!');
      }
    });
  },
  overwrite(filename, data, callback) {
    fs.open(`${dataDir}/${filename}.json`, 'r+', (err, fileDescriptor) => {
      if(!err && fileDescriptor) {
        fs.truncate(fileDescriptor, (err) => {
          if(!err) {
            fs.writeFile(fileDescriptor, JSON.stringify(data), (err) => {
              if(!err) {
                fs.close(fileDescriptor, (err) => {
                  if(!err) {
                    // no errors writing to a file
                    callback(false);
                  } else {
                    callback('Error closing file!');
                  }
                });
              } else {
                callback('Error writing to file!');
              }
            });
          } else {
            callback(err);
          }
        });
      } else {
        callback('Error openning file!');
      }
    });
  },
  remove(filename, callback) {
    fs.unlink(`${dataDir}/${filename}.json`, (err, data) => {
      callback(err, data)
    });
  },
};

module.exports = dataUtil;
