Hats = new Mongo.Collection("hats");

/******************
 * CLIENT SIDE
 */
if (Meteor.isClient) {
    Meteor.subscribe("hats");
    Session.setDefault('message', "");
    Session.setDefault('error', "");
    Session.setDefault('createFormTargets', [{index: 1}]);
    Session.setDefault('showSantas', false);
    Session.setDefault('currentTarget', "");

    /******************
     * MAIN TEMPLATE
     */
    Template.main.events({
        "click #login-buttons-logout": function() {
            Object.keys(Session.keys).forEach(function(key) {
                Session.set(key, undefined);
            });
            Session.keys = {};
            Session.setDefault('message', "");
            Session.setDefault('error', "");
            Session.setDefault('createFormTargets', [{index: 1}]);
            Session.setDefault('showSantas', false);
            Session.setDefault('currentTarget', "");
            Router.go('/');
        }
    })

    /******************
     * NAVIGATION TEMPLATE
     */
    //  Template.loginButtons.events({
    //      "click #signup_link": function() {
    //          console.log("it was clicked");
    //          $('div.login-form-create-account div#login-dropdown-list div.login-form')
    //          .prepend("<div id=\"login-name-label-and-input\"><label id=\"login-name-label\" for=\"login-name\">Name</label><input id=\"login-name\" type=\"text\"></input></div>");
    //      },
    //      "click div.login-form-create-account #login-buttons-password": function() {
    //          var name = $('#login-name').value;
    //          console.log(name);
    //      }
    //  });

    /******************
     * HOME TEMPLATE
     */
     Template.home.helpers({
         hats: function() {
             var userId = Meteor.userId();
             // find all hats where the user is a target
             // but not already a santa
             var hats = Hats.find({
                 'targets.target._id': userId,
                //  'targets.santa': { $ne: userId }
             });

             return hats;
         }
     })

    /******************
     * CREATE TEMPLATE
     */
    Template.create.helpers({
        createFormTargets: function() {
            return Session.get('createFormTargets');
        },
        deletableTargets: function() {
            if (Session.get('createFormTargets').length > 1) {
                return true;
            } else {
                return false;
            }
        },
        error: function() {
            return Session.get('error');
        }
    });

    Template.create.events({
        "click .addTargets": function(event) {
            var targets = Session.get('createFormTargets');
            var last = targets[targets.length - 1];
            targets.push({index: last.index + 1});
            Session.set('createFormTargets', targets);
        },
        "click .deleteTargets": function(event) {
            var targets = Session.get('createFormTargets');
            targets.pop();
            Session.set('createFormTargets', targets);
        },
        "submit .createForm": function(event) {
            event.preventDefault();
            // get all the data in a nice array
            var formData = $('.createForm').serializeArray();

            // check the name
            var name = formData[0].value;
            if (!name) {
                Session.set('error', 'Your hat needs a name.');
                $('input#name').addClass('error');
                return;
            } else {
                $('input#name').removeClass('error');
            }

            // check the invites
            var invites = [];
            for (var i = 1; i < formData.length; i++) {
                var val = formData[i].value;
                if (val) {
                    // if the value exists, make sure it isn't...
                    if (invites.indexOf(val) !== -1) {
                        // ...a duplicate entry
                        $('#invite-' + i).addClass('error');
                        Session.set('error', 'You have a duplicate email: ' + val);
                        return;
                    } else if ( Meteor.user().emails.some(function(email) {
                        return email.address === val;
                    })) {
                        // ...themelves
                        $('#invite-' + i).addClass('error');
                        Session.set('error', 'You don\'t need to invite yourself');
                        return;
                    } else {
                        // all is well, add them to the list
                        $('#invite-' + i).removeClass('error');
                        invites.push(val);
                    }
                } else {
                    // there is no entry here
                    $('#invite-' + i).addClass('error');
                    Session.set('error', 'You have an empty field');
                    return;
                }
            }

            Meteor.call('createHat', name, invites, function(err, result) {
                if (err) console.log(err);
                if (result.error) {
                    Session.set('error', result.error);
                } else {
                    // return the session variables to the original form
                    Session.set('createFormTargets', [{index: 1}]);
                    Session.set('error', '');
                    // redirect user to manage this hat
                    Router.go('/manage/' + result.hatId);
                }
            });
        }
    });

    /******************
     * MANAGE LIST TEMPLATE
     */
     Template.manageList.helpers({
         hats: function() {
             var hats = Hats.find({ created_by: Meteor.userId() }).fetch();
             return hats;
         }
     })

    /******************
     * MANAGE ONE TEMPLATE
     */
    Template.manageOne.helpers({
        targets: function() {
            Session.set('targets', this.targets);
            return this.targets;
        },
        showSantas: function() {
            return Session.get('showSantas');
        },
        alreadyPicked: function() {
            return findSanta(this.target._id, Session.get('targets'));
        }
    });

    Template.manageOne.events({
        "click .deleteHat": function() {
            Hats.remove(this._id);
            Router.go('manage');
        },
        "click .showSantas": function() {
            Session.set('showSantas', true);
        },
        "click .hideSantas": function() {
            Session.set('showSantas', false);
        }
    });

    /******************
     * HAT TEMPLATE
     */
    Template.hat.helpers({
        message: function() {
            return Session.get('message');
        },
        currentTarget: function() {
            return Session.get('currentTarget');
        },
        selected: function() {
            if (this.santa == Meteor.userId()) {
                var currentTarget = Meteor.users.findOne({ _id: this.target._id })
                Session.set('currentTarget', currentTarget);
                return "selected";
            }
        }
    });

    Template.hat.events({
        "click .hatPick": function(event) {
            event.preventDefault();

            Meteor.call('setSanta', this._id, function(err, result) {
                if (err) console.log(err);
                if (result) {
                    Session.set('currentTarget', result.target);
                    Session.set('message', result.message);
                    // $('div#' + result.target._id).addClass('selected');
                }
            });
        }
    });

    /******************
     * PROFILE TEMPLATE
     */
     Template.profile.events({
         "submit .profileForm": function(event) {
             event.preventDefault();

             var name = $('.profileForm #name').value;
             console.log(name);
         }
     });
}

/******************
 * SERVER SIDE
 */
if (Meteor.isServer) {
    Meteor.publish("hats", function() {
        return Hats.find({
            $or: [
                { created_by: this.userId },
                { 'targets.target._id': this.userId }
            ]
        });
    });
    Meteor.startup(function() {
        var ids = [];
        if (Meteor.users.find().count() === 0) {
            ids.push(Accounts.createUser({ email: 'b.fedor626@gmail.com', password: 'uLa7FLZR', profile: { name: 'Becca' }}));
            ids.push(Accounts.createUser({ email: 'bphillip@fandm.edu', password: 'jGT3mGt3', profile: { name: 'Ben' }}));
            ids.push(Accounts.createUser({ email: 'cathyphillips@comcast.net', password: 'C5UvNEQ5', profile: { name: 'Cathy' }}));
            ids.push(Accounts.createUser({ email: 'cyfedor@gmail.com', password: 'JfUpE5Th', profile: { name: 'Cy' }}));
            ids.push(Accounts.createUser({ email: 'dphillips@phillipsdipisa.com', password: 'QpSc93j6', profile: { name: 'Dan' }}));
            ids.push(Accounts.createUser({ email: 'fedor720@verizon.net', password: 'NeeBrs5R', profile: { name: 'Deb' }}));
            ids.push(Accounts.createUser({ email: 'emilylyfedor@gmail.com', password: '5Q4azPDc', profile: { name: 'Emily' }}));
            ids.push(Accounts.createUser({ email: 'phijt-15@rhodes.edu', password: 'W26jmZdy', profile: { name: 'Jeremy' }}));
            ids.push(Accounts.createUser({ email: 'poffyk@gmail.com', password: 'pFCh2G2g', profile: { name: 'Kathy' }}));
            ids.push(Accounts.createUser({ email: 'kaitlynfedor@gmail.com', password: 'TzYXJ9j2', profile: { name: 'Katie' }}));
            ids.push(Accounts.createUser({ email: 'poffy@comcast.net', password: 'HA6WgCFQ', profile: { name: 'Steve' }}));
            ids.push(Accounts.createUser({ email: 'zachfedor@gmail.com', password: 'M1th4c4R', profile: { name: 'Zach' }}));
        }
        if (Hats.find().count() === 0) {
            var targets = [];
            for (var i = 0; i < ids.length; i++) {
                var user = Meteor.users.findOne({ _id: ids[i] });
                targets.push({ target: user, santa: null });
            }

            // targets.sort(sortTargets);

            Hats.insert({ created_by: ids[11], name: "Poffenberger Christmas 2015", targets: targets});
        }
    });

    Accounts.config({ forbidClientAccountCreation: true });

    /******************
     * METEOR METHODS
     */
    Meteor.methods({
        checkSanta: function(hatId) {
            // find a hat if the current user is already a santa
            var hat = Hats.findOne({ _id: hatId, 'targets.santa': this.userId });

            // if so, return the target's id
            if (hat) {
                for (var i = 0; i < hat.targets.length; i++) {
                    if (hat.targets[i].santa == this.userId) {
                        return { success: true, target: hat.targets[i].target };
                    }
                }
            }

            // if not, return the original hat id
            return { success: false, hatId: hatId };
        },
        setSanta: function(hatId) {
            // first we need to check to see if the user is already a santa
            var result = Meteor.call('checkSanta', hatId);

            // if the user is already a santa, return their target
            if(result.success) {
                return { target: result.target,
                    message: "You already picked a name out of the hat" };
            } else {
                // find this hat and prep some variables for later
                var hat = Hats.findOne({ _id: hatId });
                var current = Meteor.user();
                var targets = [];

                // check all the targets in the hat
                for (var i = 0; i < hat.targets.length; i++) {
                    // if they don't have a santa and aren't the current user
                    if (hat.targets[i].santa == null && hat.targets[i].target._id != current._id) {
                        // store them in an array as a potential target
                        targets.push(hat.targets[i]);
                    }
                }

                // find a random target
                var index = Math.floor(Math.random() * targets.length);
                var target = targets[index].target;

                // update the hat with the current user id saved as the target's santa
                Hats.update({ _id: hatId, "targets.target": target},
                    { "$set" : { "targets.$.santa": current._id }},
                    function(err, result) {
                        if (err) console.log(err);

                        if (result == 1) {
                            return { target: target,
                                message: "Congrats! You picked " + target.profile.name };
                        }

                        return {target: null, message: "Sorry, there was an erro. Try again."};
                    });
            }
        },
        createHat: function(name, invites) {
            var targets = [{ target: Meteor.user(), santa: null }];
            var error = false;

            for (var i = 0; i < invites.length; i++) {
                var user = Accounts.findUserByEmail(invites[i]);
                if (user) {
                    targets.push({ target: user, santa: null });
                } else {
                    error = "Sorry, but " + invites[i] + " is not a registered user.";
                }
            }

            if (error) return { error: error };

            var hatId = Hats.insert({ name: name, created_by: Meteor.userId(), targets: targets })

            return { error: error, hatId: hatId };
        }
    });

}

// function sortTargets(a, b) {
//     console.log("sorting!");
//     if (a.target.profile.name < b.target.profile.name)
//         return -1;
//     if (a.target.profile.name < b.target.profile.name)
//         return 1;
//     return 0;
// }
function findSanta(id, array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].santa === id) {
            console.log(array[i]);
            return array[i];
        }
    }
    return false;
}

/******************
 * IRON ROUTING
 */
Router.configure({
    layoutTemplate: 'main'
});
Router.route('/', {
    name: 'home',
    template: 'home'
});
Router.route('/profile', {
    name: 'profile',
    template: 'profile'
});
Router.route('/create', {
    name: 'create'
});
Router.route('/manage', {
    name: 'manage',
    template: 'manageList'
});
Router.route('/manage/:_id', {
    template: 'manageOne',
    data: function() {
        var hat = Hats.findOne({ _id: this.params._id, created_by: Meteor.userId() });
        if (hat) {
            return hat;
        } else {
            Router.go('/');
        }
    }
});
Router.route('/:_id', {
    template: 'hat',
    data: function() {
        var currentId = Meteor.userId();
        var hat = Hats.findOne({ _id: this.params._id, "targets.target._id": currentId });
        if (hat) {
            // hat.targets.sort(sortTargets);
            return hat;
        } else {
            Router.go('/');
        }
    }
});
