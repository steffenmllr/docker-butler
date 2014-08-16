var Docker  = require('dockerode');
var Promise = require('bluebird');
var Temp    = require('temp');
var spawn   = require('child-process-promise').spawn;
var _       = require('lodash');
var url     = require('url');
var Tar     = require('tar-fs');
var chalk   = require('chalk');

function dockerButler (args) {
    this.config = args;
    Temp.track();
    this._started = [];
    this._running = [];

}

dockerButler.prototype.serve = function () {
    var self = this;

    if (this.config.h) {
        var connection = url.parse(this.config.h);
        self._docker = new Docker({host: connection.hostname, port: connection.port});
    } else {
        self._docker = new Docker({
            socketPath: this.config.socket
        });
    }

    // We test if we have a socket
    return Promise.all([this.cloneRepo(), this.getRunningConainers()]).bind(this)
            .then(self.builImage)
            .then(self.runContainers)
            .then(self.stopOldContainers);

};


dockerButler.prototype.cloneRepo = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        Temp.mkdir('dockerButler', function(err, dirPath) {
            if(err) { return reject(err); }
            self.log('Generated Tmp dir in: ' + dirPath);
            self._dirPath = dirPath;

            spawn('git', ['clone', '--branch=' + self.config.branch,  '--depth=1', self.config.git, dirPath])
                .progress(function(childProcess) {
                    childProcess.stderr.on('data', function(data) {
                        self.log(data.toString());
                    });
                })
                .then(resolve)
                .catch(reject);
        });
    });
};

dockerButler.prototype.getRunningConainers = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        self._docker.listContainers({ all: true }, function(err, containers) {
            if(err) { return reject(err); }
            self._running = _.compact(_.map(containers, function(container) {
                if(container.Image === self.config.tag + ':latest') {
                    return container.Id;
                }
                return false;
            }));

            self.log('Running Containers: ' + self._running.length);

            // Resolve after listing
            resolve();
        });
    });
};


dockerButler.prototype.builImage = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        self._docker.buildImage(Tar.pack(self._dirPath), {t: self.config.tag}, function (err, stream){
            if(err) { return reject(err); }
            stream.on('end', function () {
                self.log('Build Image with Tag: ' + self.config.tag);
                resolve();
            });
            stream.on('data', function (data) {
                var output = JSON.parse(data.toString());
                if(output.stream) {
                    self.log(output.stream);
                }
            });
        });
    });
};

dockerButler.prototype.runContainers = function() {
    var self = this;
    return new Promise(function(resolve, reject) {


        self._docker.createContainer({Image: self.config.tag}, function (err, container) {
            if(err) { return reject(err); }
            var startOptions = {};

            // Set DNS
            if (self.config.dns) {
                startOptions.Dns = container.defaultOptions.start.Dns = (typeof self.config.dns === 'string' ? [self.config.dns] : self.config.dns);
            }

            // Set Volumes
            if (self.config.volumes) {
                startOptions.Binds = container.defaultOptions.start.Binds = (typeof self.config.volumes === 'string' ? [self.config.volumes] : self.config.volumes);
            }

            // Set Envs
            if (self.config.env) {
                startOptions.Env = container.defaultOptions.start.Env = (typeof self.config.env === 'string' ? [self.config.env] : self.config.env);
            }

            // Run the container
            container.start(function(err, data) {
                if (err) { return reject(err); }
                self._started.push(container.id);
                resolve();
            });
        });
    });
};

dockerButler.prototype.stopOldContainers = function (callback) {
    var self = this;

    var removeContainer = function (containerId) {
        return new Promise(function (resolve, reject) {
            self._docker.getContainer(containerId).remove({force:true}, function (err) {
                if(err) { return reject(err); }
                resolve();
            });
        });
    };

    // If there is nothing running, we don't have to stop
    if (self._running.length === 0) {
        return {
            stopped: self._running,
            started: self._started
        };
    }

    var containersToStop = [];
    self._running.forEach(function(id) {
        containersToStop.push(removeContainer(id));
    });

    return Promise.all(containersToStop).then(function () {
        return {
            stopped: self._running,
            started: self._started
        };
    });
};

dockerButler.prototype.log = function (mgs) {
    console.log(chalk.blue('dbutler'), mgs);
};


module.exports  = dockerButler;