var Fiber = Npm.require('fibers');

var Future = Npm.require('fibers/future');

// Serverside functions
Server = {
    gitlabUrl: 'http://gitlab.ermlab.com/',

    foo: function () {
        console.log("Called server side function");
    },

    getAdminApi: function () {
        return new GitLab({
            url: Server.gitlabUrl,
            token: 'zEysg8PhvSYh2QRkYGz3'
        });
    },

    getUserApi: function (privateToken) {
        return new GitLab({
            url: Server.gitlabUrl,
            token: privateToken
        });
    }
};


Meteor.startup(function () {
    // code to run on server at startup
});

Accounts.registerLoginHandler(function (loginRequest) {

    // Update all projects
    var projectsFuture = new Future();
    Server.getAdminApi().projects.all(function (projects) {
        projectsFuture.return(projects);
    });
    var projects = projectsFuture.wait();

    for (var i = 0; i < projects.length; i++) {
        var existingProject = Projects.findOne({
            id: projects[i].id
        });

        if (existingProject !== undefined) {
            projects[i]._id = existingProject._id;
        }
        Projects.upsert({
            _id: projects[i]._id
        }, projects[i]);
    }

    // Authorize user and update its profile
    var userFuture = new Future();
    Server.getAdminApi().users.session(loginRequest.email, loginRequest.password, function (data) {
        userFuture.return(data);
    });
    var userData = userFuture.wait();

    var existingUser = Meteor.users.findOne({
        username: userData.username
    });

    var userId = null;
    if (existingUser !== undefined) {
        userId = existingUser._id;
        Meteor.users.update({
            _id: userId
        }, userData);
        
    } else {
        if (existingUser !== undefined) {
            userId = Meteor.users.insert(userData);
            
            ZalogowanyID = userId;
        }
    }

    return {
        userId: userId,
    };
});

Accounts.onLogin(function (data) {
    console.log("logged in", data.user);

    var user = data.user;

    // get all projects available for current user
    var projectsFuture = new Future();
    Server.getUserApi(user.private_token).projects.all(function (projects) {
        projectsFuture.return(projects);
    });
    var projects = projectsFuture.wait();

    var in_projects = [];
    for (var i = 0; i < projects.length; i++) {
        in_projects.push(projects[i].id);
    }
    console.log(user._id, " has access to ", in_projects);

    Meteor.users.update({
        _id: user._id
    }, {
        $set: {
            in_projects: in_projects
        }
    });
});