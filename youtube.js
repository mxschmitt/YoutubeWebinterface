registerPlugin({
    name: 'Youtube Webinterface!',
    version: '3.0',
    description: 'Youtube Webinterface for playing and downloading YouTube Tracks.',
    author: 'mxschmitt <max@schmitt.mx> & irgendwer <dev@sandstorm-projects.de>',
    backends: ['ts3', 'discord'],
    enableWeb: true,
    requiredModules: ["http"],
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
    },
        // {
        //     name: 'ytDirectSearch',
        //     title: 'Enable the direct search for youtube via the normal webinterface. Enable it only on 1 instance!',
        //     type: 'checkbox'
        // }
    ]
}, (_, config) => {
    const errorMessages = {
        NoPermission: "Do you have enough permissions for this action?",
        DLDisabled: "Downloading is not enabled.",
        EQDisabled: "Enqueuing is not enabled.",
        PlayDisabled: "Playing is not enabled.",
        NoAPIKey: "No Youtube API Key set."
    };
    const engine = require('engine');
    const store = require('store');
    const event = require('event');
    const media = require('media');
    const http = require('http');
    const format = require('format');

    engine.log("YTWeb Webinterface Ready");

    // if (config.ytDirectSearch && (config.ytApiKey || store.get("ytapikey"))) {
    //     sinusbot.registerHandler({
    //         isHandlerFor(url) {
    //             if (url.substring(0, 6) == 'ytwiyt') {
    //                 return true;
    //             }
    //             if (/youtube\.com/.test(url)) {
    //                 return true;
    //             }
    //             return false;
    //         },
    //         getTrackInfo(url, cb) {
    //             if (/youtube\.com/.test(url)) {
    //                 return cb({
    //                     urlType: 'ytdl',
    //                     url
    //                 });
    //             }
    //             return cb({
    //                 urlType: 'ytdl',
    //                 url: url.substring(19)
    //             });
    //         },
    //         getSearchResult(search, cb) {
    //             engine.log("Youtube triggered.");
    //             sinusbot.http({
    //                 timeout: 6000,
    //                 url: `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(search)}&maxResults=20&type=video&key=${encodeURIComponent(store.get("ytapikey"))}`
    //             }, (err, data) => {
    //                 if (err || !data || data.statusCode != 200) {
    //                     return cb(null);
    //                 }
    //                 const result = [];
    //                 var data = JSON.parse(data.data);
    //                 if (!data || !data.items) {
    //                     engine.log('Error in json');
    //                     return cb(null);
    //                 }
    //                 data.items.forEach(({snippet, id}) => {
    //                     result.push({
    //                         title: snippet.title,
    //                         artist: snippet.channelTitle,
    //                         coverUrl: snippet.thumbnails.default.url,
    //                         url: `ytwiyt://ytdl/?url=${encodeURIComponent(id.videoId)}`
    //                     });
    //                 });
    //                 return cb(result);
    //             });
    //         }
    //     });
    // } else {
    //     engine.log(errorMessages.NoAPIKey);
    // }

    event.on('chat', ({ text, client }) => {
        if (text.startsWith("!playlist ")) {
            let playlistID;
            let playlistURL;
            let amount = 10;
            const _tmpSplit = text.replace("[URL]", "").replace("[/URL]", "").split(" ");
            playlistURL = _tmpSplit[1]
            if (_tmpSplit.length > 2) {
                amount = _tmpSplit[2];
            }
            playlistID = getGetParameter(playlistURL, "list");
            if (playlistID.length == 34) {
                let authorized = false;
                client.getServerGroups().forEach(group => {
                    if (config.ytAlllowed.split(",").includes(group.id())) {
                        authorized = true;
                        return true;
                    }
                });
                if (authorized) {
                    http.simpleRequest({
                        method: "GET",
                        url: `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${amount}&playlistId=${encodeURIComponent(playlistID)}&key=${encodeURIComponent(store.get("ytapikey"))}`,
                        timeout: 6000,
                    }, (error, { statusCode, data }) => {
                        if (statusCode != 200) {
                            engine.log(error);
                            return;
                        }
                        const response = JSON.parse(data);
                        let timeout = 0;
                        engine.log(`${response.items.length} results.`);
                        response.items.forEach(({ snippet }) => {
                            client.chat(`Adding ${format.bold(snippet.title)} to queue.`);
                            timeout += 10000;
                            setTimeout(() => {
                                media.enqueueYt(`https://www.youtube.com/watch?v=${snippet.resourceId.videoId}`);
                            }, timeout);
                        });
                    });
                } else {
                    client.chat("Not authorized!");
                }
            } else {
                client.chat(`Error: Invalid url (list = ${playlistID})`);
            }
        } else if ((text === "!ytplaylist") || (text === "!ytplaylist help")) {
            client.chat("When you authorized (set your groupID in the script settings) you can enqueue a complete playlist via a chat message.");
            client.chat("E.g. '!playlist https://www.youtube.com/playlist?list=PLKOXXePgWciOO61ZUSzTDQQGyD_546BGA'");
        }
    });

    if (typeof config.ytApiKey != 'undefined') {
        store.set("ytapikey", config.ytApiKey);
    }

    event.on('api:ytplay', ev => {
        const res = new Response();
        // Check for PRIV_PLAYBACK
        if (!ev.user() || !ev.user().privileges || (ev.user().privileges() & 0x1000) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.play != 1) {
            media.yt(ev.data());
            engine.log(`YTWeb Triggered with "played" at ${ev.data()}`);
            res.setData("The Video will be sucessfully played now.");
            return res.getData();
        } else {
            engine.log(`YTWeb tried to play ${ev.data()} but it was deactivated.`);
            res.setError(errorMessages.PlayDisabled);
            return res.getData();
        }
    });

    event.on('api:ytenq', ev => {
        const res = new Response();
        // Check for PRIV_ENQUEUE
        if (!ev.user() || !ev.user().privileges || (ev.user().privileges() & 0x2000) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.enq != 1) {
            media.enqueueYt(ev.data());
            engine.log(`YTWeb Triggered with "enque" at ${ev.data()}`);
            res.setData("The Video will be sucessfully enqueued now.");
            return res.getData();
        } else {
            engine.log(`YTWeb tried to play ${ev.data()} but it was deactivated.`);
            res.setError(errorMessages.EQDisabled);
            return res.getData();
        }
    });

    event.on('api:ytdl', ev => {
        const res = new Response();
        // Check for PRIV_UPLOAD_FILE
        if (!ev.user || !ev.user().privileges || (ev.user().privileges() & 0x4) == 0) {
            res.setError(errorMessages.NoPermission);
            return res.getData();
        }
        if (config.dl != 1) {
            media.ytdl(ev.data(), false);
            engine.log(`YTWeb Triggered with "downloaded" at ${ev.data()}`);
            res.setData("The Video will be sucessfully downloaded now.");
            return res.getData();
        } else {
            engine.log(`YTWeb tried to download ${ev.data()} but it was deactivated.`);
            res.setError(errorMessages.DLDisabled);
            return res.getData();
        }
    });

    event.on('api:ytwebconfig', ev => ({
        data: {
            play: config.play != 1,
            enqueue: config.enq != 1,
            download: config.dl != 1,
            ytapikey: store.get("ytapikey")
        }
    }));

    class Response {
        constructor() {
            this.success = true;
            this.data = null;
        }
        setData(data) {
            this.data = data;
        }
        getData() {
            return {
                data: this.data,
                success: this.success
            }
        }
        setError(error) {
            this.success = false;
            this.data = error;
        };
    }

    function getGetParameter(url, name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        const regexS = `[\\?&]${name}=([^&#]*)`;
        const regex = new RegExp(regexS);
        const results = regex.exec(url);
        return results == null ? null : results[1];
    }
});
