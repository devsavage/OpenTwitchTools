﻿$(function() {
	window.socket = io.connect("127.0.0.1:18044");

	$("#loginModal").modal();

	initializeCommunication();
	initializeHandlers();
	initializeKnockout();
});

function initializeCommunication() {
	$.get("/loginInfo", function(data) {
		$("#username").val(data.username);
		$("#password").val(data.password);

		_.each(data.channels, function(item) {
			$("#channel").append($("<option></option>").attr("value", item).text(item));
		});

		$("#channel").select2();
	}, "json");
}

function initializeHandlers() {
	$("#getAuthButton").click(function() {
		$("#authTokenModal").modal();
	});

	$("#loginForm").submit(function(event) {
		event.preventDefault();

		var submitData = {
			username: $("#username").val(),
			password: $("#password").val(),
			channel: $("#channel").val()
		};

		$.post("/", submitData).done(function(data) {
			if(!data.isValid) {
				alert(data.error);
			}
			else {
				$("#loginModal").modal("hide");
				$(".body-content").show();
				window.viewModel.joinChannel(data.channel);
			}
		});
	});

	$("#chatForm").submit(function(event) {
		window.socket.emit("outgoingMessage", $("#chatMessage").val());
		$("#chatMessage").val(null);
		event.preventDefault();
	});

	socket.on("incomingMessage", function(data) {
        window.viewModel.addComment(data);
        window.scrollTo(0, document.body.scrollHeight);
	});
}

function initializeKnockout() {
	var commentViewModel = function(data, channelBadges) {
		var self = this;

		self.Name = data.name;
		self.Color = data.color;
		self.Message = data.message;
		self.Badges = parseAttributes(data.attributes, channelBadges);
	};

	var channelViewModel = function(data, selectedChannel) {
		var self = this;

		self.ChannelName = data;
		self.Comments = ko.observableArray();
		self.Badges = [];

		self.Selected = ko.computed(function() {
			return this === selectedChannel();
		}, this);

		self.addComment = function(comment) {
			self.Comments.push(new commentViewModel(comment, self.Badges));

			if(self.Comments().length > 100) {
				self.Comments.shift();
			}
		};
	};

	var windowViewModel = function() {
		var self = this;

		self.OutgoingMessage = ko.observable();
		self.Channels = ko.observableArray();
		self.SelectedChannel = ko.observable();

		self.addComment = function(data) {
			var matchingChannel = _.find(self.Channels(), function(channel) {
				return channel.ChannelName === data.channel;
			});

			if(matchingChannel) {
				matchingChannel.addComment(data);
			}
		};

		self.joinChannel = function(data) {
			var newChannel = new channelViewModel(data, self.SelectedChannel);
			self.Channels.push(newChannel);
			self.SelectedChannel(newChannel);
			getBadges(data);
		};

		self.setBadges = function(data) {
			var matchingChannel = _.find(self.Channels(), function(channel) {
				return channel.ChannelName === data.channel;
			});

			if(matchingChannel) {
				matchingChannel.Badges = data.badges;
			}
		};
	};

	window.viewModel = new windowViewModel();
	ko.applyBindings(viewModel);
}

function getBadges(channelName) {
	$.get("/badges", {channel: channelName}, function(data) {
		window.viewModel.setBadges(data);
	}, "json");
}

function parseAttributes(attributes, availableBadges) {
	if(!attributes || attributes.length === 0 || availableBadges.length === 0) {
		return "";
	}

	var attributeString = "";
	_.each(attributes, function(attribute, index, list) {
		var matchingBadge = _.find(availableBadges, function(badge) {
			return badge.role === attribute;
		});

		attributeString = attributeString + "<img alt='" + matchingBadge.role + "' src='" + matchingBadge.url + "' /> ";
	});

	return attributeString;
}