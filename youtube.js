registerPlugin({
    name: 'Youtube Webinterface!',
    version: '1.0',
    description: 'Youtube Webinterface for playing and downloading YouTube Tracks.',
    author: ' MaxS <info@schmitt-max.com>',
    vars: {
        ytkey: {
            title: 'Youtube API Key (see the tutorial for instructions)',
            type: 'string'
        }
    },
    enableWeb: true
}, function(sinusbot,config, info){
sinusbot.log("YTWeb Webinterface Ready");
    sinusbot.on('api:ytplay', function(ev) {
        sinusbot.yt(ev.data);
        sinusbot.log('YTWeb Triggered with "played" at '+ ev.data);    
        return 'The Video will be sucessfully played now.';
        
});
    sinusbot.on('api:ytenq', function(ev) {
        qyt(ev.data);
        sinusbot.log('YTWeb Triggered with "enque" at '+ ev.data);    
        return 'The Video will be sucessfully enqueued now.';   
        
});
    sinusbot.on('api:ytdl', function(ev) {
        sinusbot.log('YTWeb Triggered with "downloaded" at '+ ev.data); 
        sinusbot.ytdl(ev.data); 
        return 'The Video will be sucessfully downloaded now.';
        
});
    sinusbot.on('api:ytkey', function(ev) {
        return config.ytkey;
        
});    
});