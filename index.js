var dockops = require('dockops');
var spawn = require('child_process').spawn;
var tmp = require('tmp');
var tar = require('tar-fs');
var rimraf = require('rimraf');
var async = require('async');
var _ = require('lodash');

tmp.setGracefulCleanup();

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
                var ids = _.compact(_.map(running, function(container) {
                    if(container.Image === config.tag + ':latest' && container.Status.indexOf('Up') !== -1) {
                        return container.Id;
                    }
                    return false;
                }));
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
                rimraf(path, function () {
                    callback(err, ids);
                });
            });
        },
        function (runningContainers, callback) {
            console.log('runningContainers', runningContainers);

            async.times(config.containers, function(n, done){
                containers.run({
                    create: { Image: config.tag, Env: config.env, Dns: config.dns, Volumes: config.volumes }
                }, function(err, container) {
                    done(err, (container||{}).id);
                });
            }, function(err, newContainers) {
                callback(err, runningContainers, newContainers);
            });
        },
        function (runningContainers, newContainers, callback) {
            runningContainers = runningContainers || [];
            if(runningContainers.length > 0) {
                console.log('Stopping: ', runningContainers.length + ' old Containers');
                // Stop Running Images
                async.each(runningContainers, function (id, done) {
                    containers.stop(id, done);
                }, function (err) {
                    callback(err, newContainers);
                });
            } else {
                callback(null, newContainers);
            }
        },
        function (newContainers, callback) {
            // Cleanup all Stopped containers
            containers.listStopped(function (err, stoppedContainers) {
                callback(err, stoppedContainers, newContainers);
            });
        },
        function (stoppedContainers, newContainers, callback) {
            if(stoppedContainers.length > 0 && config.clean) {
                containers.removeStopped(function (err) {
                    callback(err, newContainers);
                });
            } else {
                callback(null, newContainers);
            }

        }
    ], done);

}