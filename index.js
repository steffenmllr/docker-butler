var Docker = require('dockerode');
var Promise = require('bluebird');
var temp = require('temp');
var spawn = require('child_process').spawn;
var tar = require('tar-fs');
var debug = require('debug');
var url = require('url');

// Logging
debug.enable('dbulter:*');
var errorLog = debug('dbulter:error');
var infoLog = debug('dbulter:info');



/**
 * Gets Running containers
 * @param  {[type]} docker [description]
 * @return {[type]}        [description]
 */
function getRunninContainers (docker, tagname) {

    return new Promise(function(resolve, reject) {
        docker.listContainers(function (err, containers) {
            if(err) return reject(err);
            var running = containers.filter(function (container) {
                return container.Image === tagname;
            }).map(function (container) {
                return container.Id;
            });

            infoLog(running.length + ' containers running named ' + tagname);
            resolve(running);
        });
    });
}


/**
 * Clones the repo
 * @param  {[type]} gitUrl [description]
 * @param  {[type]} branch [description]
 * @return {[type]}        [description]
 */
function cloneRepo(gitUrl, branch) {
    return new Promise(function (resolve, reject) {
        temp.mkdir('dockerButler', function(err, dirPath) {
            if(err) { return reject(err); }
            infoLog('Cloning branch ' + branch + ' into: ' + dirPath);
            var clone = spawn('git', ['clone', '--branch=' + branch,  '--depth=1', gitUrl, dirPath]);
            clone.stderr.on('data', function(err) {
                infoLog(err.toString().replace(/\n$/, ''));
            });

            clone.stdout.on('data', function(data) {
                infoLog(data.toString().replace(/\n$/, ''));
            });

            clone.on('close', function(code) {
                if (code === 0) {
                    resolve(dirPath);
                } else {
                    reject();
                }
            });

            clone.on('error', function(err) {
                reject(err);
            });

        });
    });
}

/**
 * Builds the docker Container
 * @param  {[type]} docker [description]
 * @param  {[type]} tag    [description]
 * @param  {[type]} path   [description]
 * @return {[type]}        [description]
 */
function builDockerImage(docker, tag, path) {
    // Test If there is a dockerignore

    return new Promise(function (resolve, reject) {
        var pack = tar.pack(path, {
            ignore: function(name) {
                return (name.indexOf('.git') !== -1);
            }
        });

        docker.buildImage(pack, {t: tag}, function (err, stream) {
            if (err) return reject(err);
            stream.on('end', function () {
                infoLog('Build Image with Tag: ' + tag);
                resolve();
            });
            stream.on('data', function (data) {
                try {
                    var output = JSON.parse(data.toString());
                    if(output.stream) {
                        infoLog(output.stream.replace(/\n$/, ''));
                    }
                } catch (e) {}

            });
        });
    });
}

/**
 * Run the Container
 * @param  {[type]} docker       [description]
 * @param  {[type]} tag          [description]
 * @param  {[type]} startOptions [description]
 * @return {[type]}              [description]
 */
function runContainers (docker, tag, startOptions) {
    return new Promise(function(resolve, reject) {
        docker.createContainer({Image: tag, Env: startOptions.Env}, function (err, container) {
            if (err) return reject(err);
            container.start(function (err) {
                if (err) return reject(err);
                resolve(container.id);
            });
        });
    });
}

/**
 * Main Function
 * @param  {[type]} config [description]
 * @return {[type]}        [description]
 */
function dockerButler(config) {
    var docker;

    if (config.h) {
        var connection = url.parse(config.h);
        docker = new Docker({host: connection.hostname, port: connection.port});
    } else {
        docker = new Docker({
            socketPath: config.socket
        });
    }

    return Promise.props({
        running: getRunninContainers(docker, config.tag),
        created: cloneRepo(config.git, config.branch)
        .then(builDockerImage.bind(null, docker, config.tag))
        .then(runContainers.bind(null, docker, config.tag, config))
    }).then(function(result) {
        infoLog(result.created + ' started');
        if (result.running.length > 0) {
            return Promise.all(result.running).map(function (containerId) {
                return new Promise(function (resolve, reject) {
                    docker.getContainer(containerId).remove({force:true}, function (err) {
                        if (err) return reject(err);
                        infoLog(containerId + ' stopped!');
                        resolve();
                    });
                });
            });
        }
    }).catch(function (err) {
        errorLog(err);
    });
}

module.exports = dockerButler;
