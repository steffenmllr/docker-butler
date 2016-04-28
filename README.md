docker-butler
==============

> Create a new docker container from a git url, builds the container, looks up old container names, runs the container, stops the old containers and cleans up stopped containers

##### Install
`npm i docker-butler -g`


##### Usage
```
Usage: dbutler [options]

Options:
  -g, --git      The url to your github repo                                              [required]
  -t, --tag      The tag for the container                                                [required]
  -h, --host     Your docker host: eg. http://192.168.42.43:2375
  -b, --branch   The branch you want to deploy                                            [default: "master"]
  --dns          The DNS, eg. 8.8.8.8
  -v, --volumes  The volume eg /some/host_folder:/some/container_folder (host:container)
  --clean        Clean up old stopped containers                                          [default: true]
  -s, --socket                                                                            [default: "/var/run/docker.sock"]
```
