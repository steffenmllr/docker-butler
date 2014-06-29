docker-butler
==============

> Create a new docker container from a git url, builds the container, looks up old container names, runs `n` containers and stops the old containers and cleans up stopped containers

##### Install
`npm i steffenmllr/docker-butler -g`

Note: the package is not on npm

##### Usage
```
Usage: dbutler [options]

Options:
  -g, --git         The url to your github repo          [required]
  -t, --tag         The tag for the container            [required]
  -d, --docker      Your docker connection               [default: "unix:///var/run/docker.sock"]
  -b, --branch      The branch you want to deploy        [default: "master"]
  -c, --containers  How many containers you want to run  [default: 1]
  --dns             The DNS
  -v, --volumes     The volumes
  --clean           Clean up old stopped containers      [default: false]
  --env             The env vars
```

