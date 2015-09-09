console.log('Start');

var region = process.env.AWS_REGION;
var bucket  = process.env.CONFIG_FILE_BUCKET;
var topic = process.env.CONFIG_FILE_UPDATE_TOPIC;
var folder = process.env.CONFIG_FILE_FOLDER;

var aws = require('aws-sdk');
var _ = require('underscore');
var exec = require('child_process').exec;
var s3 = new aws.S3({
  region: region
});
var fs = require('fs');
var mkdirp = require('mkdirp');



var downloadAllFiles = function() {
  if (!fs.existsSync(folder)) {
    mkdirp.sync(folder);
  }

  if (fs.statSync(folder).isDirectory()) {
    var cmd = 'aws --region ' + region + ' --recursive s3 cp s3://' + bucket + ' ' + folder + '--recursive';
    console.log('cmd: ', cmd);
    exec(cmd, function(error, stdout, stderr) {
      console.log(stdout);
    });
  }
};

downloadAllFiles();

// setInterval(function() {
//   console.log('Checking for Job Changes');
//   setUpJobs();
//   console.log(jobs);
// }, 60000);

console.log("Exit");
