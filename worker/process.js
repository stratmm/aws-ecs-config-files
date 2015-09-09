console.log('Start');

var region = process.env.AWS_REGION;
var bucket  = process.env.CONFIG_FILE_BUCKET;
var queue = process.env.CONFIG_FILE_UPDATE_QUEUE;
var folder = process.env.CONFIG_FILE_FOLDER;

var aws = require('aws-sdk');
var _ = require('underscore');
var exec = require('child_process').exec;
var s3 = new aws.S3({
  region: region
});
var sqs = new aws.SQS({
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

var needUpdate = function (fn) {
  var params = {
    QueueUrl: queue,
    AttributeNames: [
      'ApproximateNumberOfMessages'
    ]
  };
  sqs.getQueueAttributes(params, function(err, data) {
    console.log('getQueueAttributes');
    console.log(err, data);
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
    var result = false;
    if (!_.isUndefined(data.Attributes)) {
      console.log(data.Attributes);
      if (parseInt(data.Attributes.ApproximateNumberOfMessages) > 0) {
        result = true;
      }
    }
    fn(result);
  });
};

downloadAllFiles();

setInterval(function() {
  console.log('Checking for File Changes');
  needUpdate(function(need_update){
    if (need_update) {
      downloadAllFiles();
    }
  });

}, 60000);


console.log("Exit");
