registerPlugin({
    name: 'Youtube Webinterface!',
    version: '1.6',
    description: 'Youtube Webinterface for playing and downloading YouTube Tracks.',
    author: 'maxibanki <max@schmitt.ovh> & irgendwer <dev@sandstorm-projects.de>',
    backends: ['ts3', 'discord'],
    vars: [{
        name: 'ytApiKey',
        title: 'Youtube API Key (see the tutorial for instructions)',
        type: 'string'
    }, {
        name: 'play',
        title: 'enable playing (just working with YouTube)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'dl',
        title: 'enable downloading (just working with YouTube)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'enq',
        title: 'enable enqueuing (just working with YouTube)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'ytAlllowed',
        title: 'Allowed group Ids split by comma without space who are allowed to use the "!playlist <playlistlink>" command.',
        type: 'string'
    }, {
        name: 'scApiKey',
        title: 'Soundcloud API Key (see the tutorial for instructions)',
        type: 'string'
    }],
    enableWeb: true
}, function (sinusbot, config, info) {
    var errorMessages = {
        NoPermission: "Do you have enough permissions for this action?",
        DLDisabled: "Downloading is not enabled.",
        EQDisabled: "Enqueuing is not enabled.",
        PlayDisabled: "Playing is not enabled."
    }
    var engine = require('engine');
    var store = require('store');
    var event = require('event');
    var media = require('media');

    engine.log("YTWeb Webinterface Ready");

    /*
     if (config.ytApiKey || sinusbot.getVar("ytapikey")) {
         sinusbot.registerHandler({
             isHandlerFor: function (url) {
                 if (url.substring(0, 6) == 'ytwiyt') {
                     engine.log(url);
                     return true;
                 }
                 if (/youtube\.com/.test(url)) {
                     engine.log(url);
                     return true;
                 }
                 engine.log('NOPE: ' + url);
                 return false;
             },
             getTrackInfo: function (url, cb) {
                 engine.log(url);
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
                     timeout: 5000,
                     url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(search) + '&maxResults=20&type=video,playlist&key=' + encodeURIComponent(store.get("ytapikey"))
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
                             title: '[YouTube]' + entry.snippet.title,
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
         engine.log("Youtube API Key is not set, so it isn't working atm.");
     }
 
 
     if (config.scApiKey) {
         sinusbot.registerHandler({
             isHandlerFor: function (url) {
                 if (url.substring(0, 6) == 'ytwisc') {
                     return true;
                 }
                 if (/soundcloud\.com/.test(url)) {
                     return true;
                 }
                 engine.log('Soundcloud: NOPE: ' + url);
                 return false;
             },
             getTrackInfo: function (url, cb) {
                 if (/soundcloud\.com/.test(url)) {
                     return cb({
                         urlType: 'ytdl',
                         url: url.substring(19)
                     });
                 }
             },
             getSearchResult: function (search, cb) {
                 engine.log("Soundcloud triggered");
                 sinusbot.http({
                     timeout: 5000,
                     url: 'http://api.soundcloud.com/tracks.json?client_id=' + config.scApiKey + '&q=' + encodeURIComponent(search) + '&limit=20'
                 }, function (err, data) {
                     if (err || !data || data.statusCode != 200) {
                         return cb(null);
                     }
                     var result = [];
                     var data = JSON.parse(data.data);
                     if (!data) {
                         engine.log('Error in json');
                         return cb(null);
                     }
                     data.forEach(function (entry) {
                         result.push({
                             title: '[SoundCloud]' + entry.title,
                             artist: entry.user.username,
                             coverUrl: entry.artwork_url,
                             url: 'ytwisc://ytdl/?url=' + entry.permalink_url,
                         });
                     });
                     return cb(result);
                 });
             }
         });
     } else {
         engine.log("Soundcloud API Key is not set, so it isn't working atm.");
     }
     */
    event.on('chat', function (ev) {
        if (ev.text.startsWith("!playlist ")) {
            var url = ev.text.substr("!playlist ".length);
            url = url.replace("[URL]", "").replace("[/URL]", "");
            url = url.substr(url.indexOf("list=") + "list=".length);
            if (url.indexOf("&") > 0) {
                url = url.substr(0, url.indexOf("&"));
            }
            url = url.trim();
            if (url.length == 34) {
                var autorized = false;
                ev.client.getServerGroups().forEach(function (group) {
                    if (config.ytAlllowed.split(",").indexOf(group) === -1) {
                        var autorized = true;
                        return true;
                    }
                });
                if (autorized) {
                    sinusbot.http({
                        "method": "GET",
                        "url": "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=" + encodeURIComponent(url) + "&key=" + encodeURIComponent(store.get("ytapikey")),
                        "timeout": 6000,
                    }, function (error, response) {
                        if (response.statusCode != 200) {
                            sinusbot.log(error);
                            return;
                        }
                        var Response = JSON.parse(response.data);
                        engine.log(Response.items.length + " results.");

                        Response.items.forEach(function (item) {
                            ev.client.chat('Adding [B]' + item.snippet.title + '[/B] to queue.');
                        });
                    });
                } else {
                    ev.client.chat("Not autorized!");
                }
            } else {
                ev.client.chat("Error: Invalid url (list = " + url + ")");
            }
        }
    });

    if (typeof config.ytApiKey != 'undefined') {
        store.set("ytapikey", config.ytApiKey);
    }

    event.on('api:ytplay', function (ev) {
        var res = new Response();
        if (!ev.user || !ev.user.privileges || (ev.user.privileges & 0x00001000) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.play != 1) {
            media.yt(ev.data);
            engine.log('YTWeb Triggered with "played" at ' + ev.data);
            res.setData("The Video will be sucessfully played now.");
            return res.getData();
        } else {
            engine.log('YTWeb tried to play ' + ev.data + ' but it was deactivated.');
            res.setError(errorMessages.PlayDisabled);
            return res.getData();
        }
    });

    event.on('api:ytenq', function (ev) {
        var res = new Response();
        if (!ev.user || !ev.user.privileges || (ev.user.privileges & 0x00004000) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.enq != 1) {
            media.qyt(ev.data);
            engine.log('YTWeb Triggered with "enque" at ' + ev.data);
            res.setData("The Video will be sucessfully enqueued now.");
            return res.getData();
        } else {
            engine.log('YTWeb tried to play ' + ev.data + ' but it was deactivated.');
            res.setError(errorMessages.EQDisabled);
            return res.getData();
        }
    });

    event.on('api:ytdl', function (ev) {
        var res = new Response();
        if (!ev.user || !ev.user.privileges || (ev.user.privileges & 0x00000004) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.dl != 1) {
            media.ytdl(ev.data, false);
            engine.log('YTWeb Triggered with "downloaded" at ' + ev.data);
            res.setData("The Video will be sucessfully downloaded now.");
            return res.getData();
        } else {
            engine.log('YTWeb tried to download ' + ev.data + ' but it was deactivated.');
            res.setError(errorMessages.DLDisabled);
            return res.getData();
        }
    });

    event.on('api:ytwebconfig', function (ev) {
        return {
            play: (config.play != 1),
            enqueue: (config.enq != 1),
            download: (config.dl != 1),
            ytapikey: store.get("ytapikey")
        };
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
            return JSON.stringify(this);
        }
        this.setError = function (error) {
            this.success = false;
            this.data = error;
        }
    }
});