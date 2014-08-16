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
  -s, --socket                                                                            [default: "unix:///var/run/docker.sock"]
```



### What the heck should I use this for? 
I use it for my continuous integration / deployment workflow. This is my workflow:

- Install [drone](https://github.com/drone/drone) on you server if you want you can setup a [proxy to nginx](https://github.com/drone/docs/blob/master/install.rst#proxy-server)
- Install [docker](https://docs.docker.com/) on your host
- Install [skydock](https://github.com/crosbymichael/skydock) on your host by running:

```bash
docker run -d -p 172.17.42.1:53:53/udp --name skydns crosbymichael/skydns -nameserver 8.8.8.8:53 -domain docker
docker run -d -v /var/run/docker.sock:/docker.sock --name skydock crosbymichael/skydock -ttl 30 -environment dev -s /docker.sock -domain docker -name skydns
```

- Setup your `.drone.yml` in the repo you want to test:

```yaml
image: bradrydzewski/node:0.10
env:
    - NODE_ENV=test
script:
    - npm test
deploy:
    ssh:
        target: deploy@yourserver.de
        cmd: 'dbutler -g git@github.com:yourname/yourrepo.git -t yourname/yourtag -e NODE_ENV=staging --dns=172.17.42.1'
```

- Tell nginx to lookup your app within skydns [like this](https://github.com/crosbymichael/skydock/blob/master/contrib/nginx.conf)
- Sit back and realize you just setup a continuous integration / deployment pipeline within a few minutes :)


