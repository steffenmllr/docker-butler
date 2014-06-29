var dockops = require('dockops');
var spawn = require('child_process').spawn;
var tmp = require('tmp');
var tar = require('tar-fs');
var rimraf = require('rimraf');
var async = require('async');
var _ = require('lodash');

module.exports = function (config, done) {
    var docker = dockops.createDocker(config.docker);
    var images = new dockops.Images(docker);
    var containers = new dockops.Containers(docker);
    dockops.logEvents(images, 'verbose');
    dockops.logEvents(containers, 'verbose');

    async.waterfall([
        tmp.dir,
        function(path, callback){
            console.log('Created Tmp Folder: ' + path);
            // Close the repo
            var clone = spawn('git', ['clone', '--branch=' + config.branch,  '--depth=1', config.git, path]).on('close', function (code) {
                callback((code === 0 ? false : true), path);
            });
            clone.stderr.on('data', function (data) {
                console.log(data.toString());
            });
        },
        function (path, callback) {
            // Find running Images
            containers.listRunning(function (err, running) {
                var ids = _.pluck(_.where(running, {'Image': config.tag + ':latest'}), 'Id');
                callback(err, path, ids);
            });
        },
        function(path, ids, callback){
            // Remove the .git folder
            rimraf(path + '/.git', function (err) {
                callback(err, path, ids);
            });
        }, function (path, ids, callback) {
            // Tar and build the image
            images.buildStream(tar.pack(path), config.tag, function (err) {
                callback(err, ids);
            });
        },
        function (runningContainers, callback) {
            console.log('runningContainers', runningContainers);

            // Start the new Containers
            async.each(_.range(0,config.containers), function (times, done) {

                containers.run({
                    create: { Image: config.tag, Env: config.env, Dns: config.dns, Volumes: config.volumes }
                }, function (err, result) {
                    console.log('CREATED: ', err, result);
                    done(err, result);
                });

            }, function (err, logs) {
                if(!err) console.log('Started ' + config.containers + ' Containers');
                callback(err, runningContainers);
            });
        },
        function (ids, callback) {
            ids = ids || [];
            if(ids.length > 0) {
                console.log('Stopping: ', ids.length + ' old Containers');
                // Stop Running Images
                async.each(ids, function (id, done) {
                    containers.stop(id, done);
                }, callback);
            } else {
                callback();
            }
        },
        function (callback) {
            // Cleanup all Stopped containers
            containers.listStopped(callback);
        },
        function (stopped, callback) {
            if(stopped.length > 0) {
                containers.removeStopped(callback);
            } else {
                callback(false);
            }
        }
    ], done);

}