registerPlugin({
    name: 'Youtube Webinterface!',
    version: '2.1',
    description: 'Youtube Webinterface for playing and downloading YouTube Tracks.',
    author: 'maxibanki <max@schmitt.mx> & irgendwer <dev@sandstorm-projects.de>',
    backends: ['ts3', 'discord'],
    enableWeb: true,
    vars: [{
        name: 'ytApiKey',
        title: 'Youtube API Key (see the tutorial for instructions)',
        type: 'string'
    }, {
        name: 'play',
        title: 'enable playing (default activated)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'dl',
        title: 'enable downloading (default activated)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'enq',
        title: 'enable enqueuing (default activated)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'ytAlllowed',
        title: 'Allowed group Ids split by comma without space who are allowed to use the "!playlist <playlistlink>" command.',
        type: 'string'
    }, {
        name: 'ytDirectSearch',
        title: 'Enable the direct search for youtube via the normal webinterface. Enable it only on 1 instance!',
        type: 'checkbox'
    }]
}, function (sinusbot, config) {
    var errorMessages = {
        NoPermission: "Do you have enough permissions for this action?",
        DLDisabled: "Downloading is not enabled.",
        EQDisabled: "Enqueuing is not enabled.",
        PlayDisabled: "Playing is not enabled.",
        NoAPIKey: "No Youtube API Key set."
    }
    var engine = require('engine');
    var store = require('store');
    var event = require('event');
    var media = require('media');

    engine.log("YTWeb Webinterface Ready");

    if (config.ytDirectSearch && (config.ytApiKey || sinusbot.getVar("ytapikey"))) {
        sinusbot.registerHandler({
            isHandlerFor: function (url) {
                if (url.substring(0, 6) == 'ytwiyt') {
                    return true;
                }
                if (/youtube\.com/.test(url)) {
                    return true;
                }
                return false;
            },
            getTrackInfo: function (url, cb) {
                if (/youtube\.com/.test(url)) {
                    return cb({
                        urlType: 'ytdl',
                        url: url
                    });
                }
                return cb({
                    urlType: 'ytdl',
                    url: url.substring(19)
                });
            },
            getSearchResult: function (search, cb) {
                engine.log("Youtube triggered.");
                sinusbot.http({
                    timeout: 6000,
                    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(search) + '&maxResults=20&type=video&key=' + encodeURIComponent(store.get("ytapikey"))
                }, function (err, data) {
                    if (err || !data || data.statusCode != 200) {
                        return cb(null);
                    }
                    var result = [];
                    var data = JSON.parse(data.data);
                    if (!data || !data.items) {
                        engine.log('Error in json');
                        return cb(null);
                    }
                    data.items.forEach(function (entry) {
                        result.push({
                            title: entry.snippet.title,
                            artist: entry.snippet.channelTitle,
                            coverUrl: entry.snippet.thumbnails.default.url,
                            url: 'ytwiyt://ytdl/?url=' + encodeURIComponent(entry.id.videoId)
                        });
                    });
                    return cb(result);
                });
            }
        });
    } else {
        engine.log(errorMessages.NoAPIKey);
    }

    event.on('chat', function (ev) {
        if (ev.text.startsWith("!playlist ")) {
            var playlistID,
                playlistURL,
                amount = 10;
            var _tmpSplit = ev.text.replace("[URL]", "").replace("[/URL]", "").split(" ");
            playlistURL = _tmpSplit[1]
            if (_tmpSplit.length > 2) {
                amount = _tmpSplit[2];
            }
            playlistID = getGetParameter(playlistURL, "list");
            if (playlistID.length == 34) {
                var authorized = false;
                ev.client.getServerGroups().forEach(function (group) {
                    if (config.ytAlllowed.split(",").indexOf(group) === -1) {
                        authorized = true;
                        return true;
                    }
                });
                if (authorized) {
                    sinusbot.http({
                        method: "GET",
                        url: "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=" + amount + "&playlistId=" + encodeURIComponent(playlistID) + "&key=" + encodeURIComponent(store.get("ytapikey")),
                        timeout: 6000,
                    }, function (error, res) {
                        if (res.statusCode != 200) {
                            engine.log(error);
                            return;
                        }
                        var response = JSON.parse(res.data),
                            timeout = 0;
                        engine.log(response.items.length + " results.");
                        response.items.forEach(function (item) {
                            ev.client.chat('Adding [B]' + item.snippet.title + '[/B] to queue.');
                            timeout += 500;
                            setTimeout(function () {
                                media.enqueueYt("https://www.youtube.com/watch?v=" + item.snippet.resourceId.videoId);
                            }, timeout);
                        });
                    });
                } else {
                    ev.client.chat("Not authorized!");
                }
            } else {
                ev.client.chat("Error: Invalid url (list = " + playlistID + ")");
            }
        } else if ((ev.text === "!ytplaylist") || (ev.text === "!ytplaylist help")) {
            ev.client.chat("When you authorized (set your groupID in the script settings) you can enqueue a complete playlist via a chat message.");
            ev.client.chat("E.g. '!playlist https://www.youtube.com/playlist?list=PLKOXXePgWciOO61ZUSzTDQQGyD_546BGA'");
        }
    });

    if (typeof config.ytApiKey != 'undefined') {
        store.set("ytapikey", config.ytApiKey);
    }

    event.on('api:ytplay', function (ev) {
        var res = new Response();
        engine.log(ev.user().privileges)
        if (!ev.user() || !ev.user().privileges || (ev.user().privileges & 0x00001000) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.play != 1) {
            media.yt(ev.data());
            engine.log('YTWeb Triggered with "played" at ' + ev.data());
            res.setData("The Video will be sucessfully played now.");
            return res.getData();
        } else {
            engine.log('YTWeb tried to play ' + ev.data() + ' but it was deactivated.');
            res.setError(errorMessages.PlayDisabled);
            return res.getData();
        }
    });

    event.on('api:ytenq', function (ev) {
        var res = new Response();
        if (!ev.user() || !ev.user().privileges || (ev.user().privileges & 0x00004000) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.enq != 1) {
            media.enqueueYt(ev.data());
            engine.log('YTWeb Triggered with "enque" at ' + ev.data());
            res.setData("The Video will be sucessfully enqueued now.");
            return res.getData();
        } else {
            engine.log('YTWeb tried to play ' + ev.data() + ' but it was deactivated.');
            res.setError(errorMessages.EQDisabled);
            return res.getData();
        }
    });

    event.on('api:ytdl', function (ev) {
        var res = new Response();
        if (!ev.user || !ev.user().privileges || (ev.user().privileges & 0x00000004) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.dl != 1) {
            media.ytdl(ev.data(), false);
            engine.log('YTWeb Triggered with "downloaded" at ' + ev.data());
            res.setData("The Video will be sucessfully downloaded now.");
            return res.getData();
        } else {
            engine.log('YTWeb tried to download ' + ev.data() + ' but it was deactivated.');
            res.setError(errorMessages.DLDisabled);
            return res.getData();
        }
    });

    event.on('api:ytwebconfig', function (ev) {
        return {
            data: {
                play: config.play != 1,
                enqueue: config.enq != 1,
                download: config.dl != 1,
                ytapikey: store.get("ytapikey")
            }
        }
    });

    String.prototype.startsWith = function (str) {
        return this.indexOf(str) == 0;
    }

    var Response = function () {
        this.success = true;
        this.data = null;
        this.setData = function (data) {
            this.data = data;
        }
        this.getData = function () {
            return {
                data: this.data,
                success: this.success
            }
        }
        this.setError = function (error) {
            this.success = false;
            this.data = error;
        }
    }

    function getGetParameter(url, name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(url);
        return results == null ? null : results[1];
    }
});
