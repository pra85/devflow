var mongoose = require('mongoose');

function removeUserFromQueue(queue, user) {
    for (var i = 0; i < queue.length; i++) {
        if (queue[i].email == user.email) {
          queue.splice(i, 1);
        }
    }
}

function findServerbyName(serverEnv, name) {
    for (var i = 0; i < serverEnv.servers.length; i++) {
        if (serverEnv.servers[i].name.toLowerCase() == name.toLowerCase()) {
            return (serverEnv.servers[i]);
        }
    }

    return (null);
}

function getUserDetails(user) {
  return ({ email: user.email, name: user.name, image: user.image });
}

var serverSchema = new mongoose.Schema({
    name : String,
    user : { email : String, name : String, image : String },
    environment: String,
    queue : [{ email : String, name : String, image : String }],
    taken_since : Date,
    is_down: Boolean,
    release_date: Date,
    url: String
});

serverSchema.methods.take = function(user, releaseDate) {
    this.user = user;
    this.taken_since = new Date();
    this.release_date = new Date(releaseDate);
    
    // remove taking user if un queue
    removeUserFromQueue(this.queue, user);
}

serverSchema.methods.setReleaseDate = function(date) {
    this.release_date = date;
}

serverSchema.methods.release = function(env) {
    if (this.queue.length == 0 && env.queue.length == 0) {
        this.user = null;
        this.taken_since = null;
        this.release_date = null;
    } else {
        var nextUser = null;

        if (this.queue.length > 0) {
            nextUser = this.queue[0];
            this.queue.splice(0, 1);
        } else if (env.queue.length > 0) {
           nextUser = env.queue[0]; // removal from queue in next event
        }

        this.user = nextUser;
        this.taken_since = new Date();
        this.release_date = new Date().setHours(this.release_date.getHours() + 1);
    }
}

serverSchema.methods.queueServer = function(user) {
    this.queue.push(user);
}

serverSchema.methods.unqueueServer = function(user) {
    removeUserFromQueue(this.queue, user);
}

serverSchema.methods.setDownState = function(isDown) {
    this.is_down = isDown;
}

var environmentSchema = new mongoose.Schema({
    name : String,
    servers: [serverSchema],
    queue: [{ email : String, name : String, image : String }]
});

environmentSchema.methods.take = function(serverName, user, releaseDate) {
    findServerbyName(this, serverName).take(getUserDetails(user), releaseDate);
}

environmentSchema.methods.setReleaseDate = function(serverName, date) {
    findServerbyName(this, serverName).setReleaseDate(date);
}

environmentSchema.methods.release = function(serverName) {
    var server = findServerbyName(this, serverName);
    server.release(this);
    return (server);
}

environmentSchema.methods.queueServer = function(serverName, user) {
    findServerbyName(this, serverName).queueServer(getUserDetails(user));
}

environmentSchema.methods.unqueueServer = function(serverName, user) {
    findServerbyName(this, serverName).unqueueServer(getUserDetails(user));
}

environmentSchema.methods.changeServerDownState = function(serverName, isDown) {
    var server = findServerbyName(this, serverName);
    server.setDownState(isDown);
}

environmentSchema.methods.queueEnv = function(user) {
    this.queue.push(getUserDetails(user));
}

environmentSchema.methods.unqueueEnv = function(user) {
    removeUserFromQueue(this.queue, user);
}

environmentSchema.methods.getServerData = function(serverName) {
    return (findServerbyName(this, serverName));
}

module.exports = mongoose.model('ServerEnvironment', environmentSchema, 'ServerEnvironments');
