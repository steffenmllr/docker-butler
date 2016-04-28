docker-butler
==============

> Create a new docker container from a git url, builds the container, looks up old container names, runs the container, stops the old containers and cleans up stopped containers

##### Install
`npm i docker-butler -g`

#### Example
`dbutler -g https://github.com/enokd/docker-node-hello.git -b master -e NODE_ENV=production -t namespace/myapp`

##### Usage
```
Usage: dbutler [options]

Options:
    -g, --git      The url to your github repo                                              [required]
    -t, --tag      The tag for the container                                                [required]
    --socket       Your socket docker connection, eg /var/run/docker.sock
    -h, --host     Your docker host: eg. http://192.168.42.43:2375
    -b, --branch   The branch you want to deploy                                            [default: "master"]
    --dns          The DNS, eg. 8.8.8.8
    -v, --volumes  The volume eg /some/host_folder:/some/container_folder (host:container)
    --wait         Time to wait to check if the container is running                        [default: 1000]
    --env          The env vars
    -s, --socket                                                                            [default: "/var/run/docker.sock"]                                                                         [default: "/var/run/docker.sock"]
```
