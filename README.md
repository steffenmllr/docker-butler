docker-buttler
==============

Create a new docker container from a git url, runs them, looks up old container names and stops them and restarts with the new image

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
  --env             The env vars
```

