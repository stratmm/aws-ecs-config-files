console.log('Loading function');

exports.handler = function(event, context) {
  // dependencies
  var aws = require('aws-sdk');
  var uuid = require('node-uuid');
  var path = require('path');

  // set variables
  var region = event.ResourceProperties.Region;

  var s3 = new aws.S3({
    region: region
  });

  response = {
    SUCCESS: "SUCCESS",
    FAILED: 'FAILED',
    send: function(event, context, responseStatus, responseData, physicalResourceId) {
      console.log('event, context, responseStatus, responseData, physicalResourceId');
      var responseBody = JSON.stringify({
          Status: responseStatus,
          Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
          PhysicalResourceId: physicalResourceId || context.logStreamName,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
          Data: responseData
      });

      console.log("Response body:\n", responseBody);

      var https = require("https");
      var url = require("url");

      var parsedUrl = url.parse(event.ResponseURL);
      var options = {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.path,
          method: "PUT",
          headers: {
              "content-type": "",
              "content-length": responseBody.length
          }
      };

      var request = https.request(options, function(response) {
          console.log("Status code: " + response.statusCode);
          console.log("Status message: " + response.statusMessage);
          context.done();
      });

      request.on("error", function(error) {
          console.log("send(..) failed executing https.request(..): " + error);
          context.done();
      });

      request.write(responseBody);
      request.end();
    }
  };

  // Create file
  var create_file = function(props, fn) {
    console.log('props');
    console.log(props);
    var meta_data = {
      "x-amz-meta-mode": props.Mode,
      "x-amz-meta-owner": props.Owner,
      "x-amz-meta-group": props.Group
    };
    var params = {
      Bucket: props.ConfigFileS3Bucket,
      Key: props.FullFileName,
      Body: props.Content,
      Metadata: meta_data,
      ContentType: 'text/plain'
    };
    s3.putObject(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
      console.log('err, data, full_file_name');
      console.log(err, data);
      fn(err, data);
    });
  };


  // handle errors encountered
  var onError = function(err, data) {
    var resp = { Error: err };
    console.log(resp.Error + ':\\n', err);
    console.log(data);
    response.send(event, context, response.FAILED, resp);
  };

  // map the new and old resource definitions
  var defs = event.ResourceProperties;
  var oldDefs = event.OldResourceProperties;

  switch(event.RequestType) {
    case 'Create':
      var ext = path.extname(defs.Filename);
      var base = path.basename(defs.Filename, ext);
      var dir = path.dirname(defs.Filename);
      defs.FullFileName = path.join(
        dir,
        base + '_' + uuid.v4() + ext
      );
      create_file(defs, function(err, data){
        if (err) onError('Create call failed', data);
        else response.send(event, context, response.SUCCESS, {}, defs.FullFileName);
      });

      break;
    case 'Update':
      defs.FullFileName = event.PhysicalResourceId;
      create_file(defs, function(err, data){
        if (err) onError('Update call failed', data);
        else response.send(event, context, response.SUCCESS, {}, defs.FullFileName);
      });
      break;
    case 'Delete':
      response.send(event, context, response.SUCCESS, {}, event.PhysicalResourceId);
      break;
  }
};
