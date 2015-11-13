var _ = require('lodash'),
    util = require('util'),
    http = require('http'),
    https = require('https'),
    querystring = require('querystring'),
    fs = require('fs');

var config = {};


fs.exists("hipfm.json", function(exists) {
  if (exists) {
    console.log('Using hipfm config file.');
    config = (JSON.parse(fs.readFileSync("hipfm.json", "utf8")));
    fetchTracks(true, config);
  } else {
    console.log('The hipfm.json file does not exist. Please create the file before using the -f flag.');b
      process.exit(1);
  }
});

function checkTracks(config) {
    var tracks = null;

    config.lastfm.users.forEach(function(element, index, array){
        var lastfmURL = 'http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=' + config.lastfm.users[index].username + '&api_key=' + config.lastfm.users[index].key + '&format=json&limit=10';
        http.get(lastfmURL, function(httpRes) {
            var data = '';

            httpRes.on('data', function (chunk){
                data += chunk;
            });

            httpRes.on('end',function(){
                tracks = JSON.parse(data);
                complete(index);
            });


        }).on('error', function(e) {
            util.log("ERROR::checkTracks " + e.message);
        });
    });

    function complete(index) {
        if (tracks !== null) {
            processData(tracks, index);
        }
    }

}

function processData(data, userIndex) {
    if (data.recenttracks && data.recenttracks.track) {
        var currentTrack = data.recenttracks.track[0];

        if (config.lastfm.users[userIndex].lastTrack != currentTrack.name) {
            var html = '';

            if (currentTrack.image[1]['#text'] !== '') {
                html += '<img src="' + currentTrack.image[1]['#text'] + '" height="32"/>';
            }
            html += '<span>&nbsp;&nbsp;</span>';
            html += '<a href="' + currentTrack.url + '">' + currentTrack.name + '</a>';
            html += ' - <a href="http://www.last.fm/music/'  + currentTrack.artist['#text'] + '">' + currentTrack.artist['#text'] + '</a>';
            html += ', <a href="http://www.last.fm/music/'  + currentTrack.artist['#text'] + '/'+ currentTrack.album['#text'] + '">' + currentTrack.album['#text'] + '</a>';

            sendToHipChat(html, userIndex);
            config.lastfm.users[userIndex].lastTrack = currentTrack.name;
            util.log(config.lastfm.users[userIndex].lastTrack + ' - ' + currentTrack.artist['#text'] + ' - ' + currentTrack.album['#text']);
        }
    }

    if(userIndex==0) { // Only call the timeout callback once to prevent n*2 callbacks each time.
        fetchTracks(false, config);
    }
}

function sendToHipChat(message, userIndex) {
    color = 'yellow';
    //message = encodeURIComponent(message);

    var post_data = querystring.stringify({
      auth_token: config.hipchat.key,
      color: color,
      message_format: "html",
      message: message,
    });

    var post_opts = {
      hostname: 'api.hipchat.com',
      port: 443,
      path: '/v2/room/' + config.hipchat.room_id + '/notification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length,
      },
    };

    var req = https.request(post_opts, function(httpRes) {
        /*
        var data = '';

        httpRes.on('data', function (chunk){
            data += chunk;
        });

        httpRes.on('end',function(){
            util.log(data);
        });
        */
    }).on('error', function(e) {
        util.log("ERROR::sendToHipChat " + e.message);
    });

    req.write(post_data);
    req.end();
}

function fetchTracks(instant, config) {
    var millis = instant ? 0 : 30000;

    setTimeout(function() {
        checkTracks(config);
    }, millis);
}
