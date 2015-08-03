Messages = new Meteor.Collection("messages");
Rooms = new Meteor.Collection("rooms");

if (Meteor.isClient) {

  Accounts.ui.config({
    requestPermissions: {
      facebook: ['user_likes'],
      github: ['user', 'repo']
    },
    requestOfflineToken: {
      google: true
    },
    passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
  }); 

  Meteor.subscribe("rooms");
  Meteor.subscribe("messages");
  Session.setDefault("roomname", "Lobby");

  Template.input.events({
    'click .sendMsg': function(e) {
       _sendMessage();
    },
    'keyup #msg': function(e) {
      if (e.type == "keyup" && e.which == 13) {
        _sendMessage();
      }
    }
  });

  _sendMessage = function() {
    var el = document.getElementById("msg");
    Meteor.call("addMessage", el.value, Session.get("roomname"));
    el.value = "";
    el.focus();
  };

  Template.messages.helpers({
    messages: function() {
      return Messages.find({room: Session.get("roomname")}, {sort: {ts: -1}});
    },
	  roomname: function() {
      return Session.get("roomname");
    }
  });

  Template.message.helpers({
    likeAction: function() {
      var mu = Meteor.user();

      return !mu || !_.contains(this.likes, mu._id);
    },
    nLikes : function(){
      return this.likes.length;
    }
  });

  Template.message.events({
    'click .like': function(e) {
      var userId = Meteor.user();
      if(userId) userId = userId._id;

      if (!userId) {
        alert("Please log in to like this message!");
        return;
      }
      Meteor.call("clickLike", this._id);
    }
  });  

  Template.rooms.events({
    'click li': function(e) {
      Session.set("roomname", e.target.innerText);
    }
  });
  
  Template.rooms.helpers({
    rooms: function() {
      return Rooms.find();
    }
  });
  
  Template.room.helpers({
	roomstyle: function() {
      return Session.equals("roomname", this.roomname) ? "font-weight: bold" : "";
    }
  });

  Template.chat.helpers({
    release: function() {
      return Meteor.release;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    //Messages.remove({});
    Rooms.remove({});
    if (Rooms.find().count() === 0) {
      ["Lobby", "Hairstyles", "BigTrucks", "Gadgets"].forEach(function(r) {
        Rooms.insert({roomname: r});
      });
    }
  });
  
  Rooms.deny({
    insert: function (userId, doc) {
      return (userId === null);
    },
    update: function (userId, doc, fieldNames, modifier) {
      return true;
    },
    remove: function (userId, doc) {
      return true;
    }
  });
  Messages.deny({
    insert: function (userId, doc) {
      return true;
    },
    update: function (userId, doc, fieldNames, modifier) {
      return true;
    },
    remove: function (userId, doc) {
      return true;
    }
  });

  var urlRegex = new RegExp('^(?:(?:http|https)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))))(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$', 'i');
  var imgParserRegex = new RegExp('\{(img)\s*=\s*([^\}]*)\}(.*)','ig');
  function parseMsg(msg){
    var result = imgParserRegex.exec(msg);
    if (!result || result[1] != 'img' || !urlRegex.test(result[2])){
      return {msg: msg};
    } else {
      return {
        msg : result[3],
        img : result[2]
      };
    }
  }

  Meteor.methods({
    addMessage : function (msg, room) {
      var u = Meteor.user();

      var data = _.extend(parseMsg(msg),{
        user:  u.username || (u.profile && u.profile.name) || "MyNameIsNobody", 
        ts:    new Date(), 
        room:  room, 
        likes: []
      });

      Messages.insert(data);      
    },
    clickLike : function(msg_id){
      var userId = Meteor.user();
      if (userId){
          userId = userId._id;
      } else {
        return false;
      }
      var msg = Messages.findOne({_id : msg_id});
      if(!msg) return false;

      var idx = msg.likes.indexOf(userId);
      if(idx > -1) {
        msg.likes.splice(idx, 1);
      } else {
        msg.likes.push(userId);
      }
      Messages.update({_id : msg_id}, {$set: {likes : msg.likes}});
      return true;
    }
  });
  
  Meteor.publish("rooms", function () {
    return Rooms.find();
  });
  Meteor.publish("messages", function () {
    return Messages.find({}, {sort: {ts: -1}});
  });
}
