//-------------CONFIG-START------------
var ytkey = 'AIzaSyC87fSxWOAp8hzKTBCWF8dpqUYMHVfbWNo';
var maxResults = 6;
//-------------CONFIG-END--------------
var prefix = "",
  nextPageToken, instanceid = '';

function tplawesome(e, t) {
  res = e;
  for(var n = 0; n < t.length; n++) {
    res = res.replace(/\{\{(.*?)\}\}/g, function(e, r) {
      return t[n][r]
    });
  }
  return res
}
$(function() {
  $("form").on("submit", function(e) {
    e.preventDefault();
    // prepare the request
    var request = gapi.client.youtube.search.list({
      part: "snippet",
      type: "video",
      q: encodeURIComponent($("#search").val()).replace(/%20/g, "+"),
      maxResults: maxResults,
      order: "relevance"
    });
    // execute the request
    request.execute(function(response) {
      var result = response.result;
      nextPageToken = result.nextPageToken;
      console.log("nextPageToken: " + nextPageToken);
      $("#results").html("");
      $.each(result.items, function(index, item) {
        $.get("src/yt.html", function(data) {
          $("#results").append(tplawesome(data, [{
            "title": item.snippet.title,
            "videoid": item.id.videoId
          }]));
        });
      });
      resetVideoHeight();
      $("#loadmore").removeClass("none");
    });
  });
  $(window).on("resize", resetVideoHeight);
});

function resetVideoHeight() {
  $(".video").css("height", $("#results").width() * 9 / 16);
}

function init() {
  gapi.client.setApiKey(ytkey);
  gapi.client.load("youtube", "v3", function() {});
}
//YT END Start Sinusbot Connection
$(document).ready(function() {
  var instanceList = $('#dropdown');
  // Get the list of instances using the currently logged in user account
  $.ajax({
    url: prefix + '/api/v1/bot/instances',
    headers: {
      'Authorization': 'bearer ' + window.localStorage.token
    },
    statusCode: {
    401: function() {
      alert('You are unauthorized!');
      window.location = getRootUrl();
    }
  }
  }).done(function(data) {
    data.forEach(function(instance) {
      // When clicking an entry, we post a request to the script interface and return the result
      $('<li/>').appendTo(instanceList).html('<a href="#">' + instance.nick + '</a>').click(function() {
        instanceid = instance.uuid;
      });
    });
    $('.dropd1 > li > a').click(function() {
      $("#dropdb1").html($(this).text() + ' <span class="caret"></span>');
    });
  });
  $("#loadmore").click(function() {
    $("#loadmorecss").addClass("fa-pulse fa-fw");
    var request = gapi.client.youtube.search.list({
      part: "snippet",
      type: "video",
      q: encodeURIComponent($("#search").val()).replace(/%20/g, "+"),
      maxResults: maxResults,
      pageToken: nextPageToken,
      order: "relevance"
    });
    // execute the request
    request.execute(function(response) {
      var result = response.result;
      nextPageToken = result.nextPageToken;
      console.log("nextPageToken: " + nextPageToken);
      $.each(result.items, function(index, item) {
        $.get("src/yt.html", function(data) {
          $("#results").append(tplawesome(data, [{
            "title": item.snippet.title,
            "videoid": item.id.videoId
          }]));
        });
      });
      resetVideoHeight();
      $("#loadmorecss").removeClass("fa-pulse fa-fw");
    });
  });
});

function endplay(url) {
  if(instanceid !== '') {
    $.ajax({
      url: prefix + '/api/v1/bot/i/' + instanceid + '/scriptEvent/ytplay',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + window.localStorage.token
      },
      data: JSON.stringify(url)
    }).done(function(data) {
      // The result will be an array with answers from the script
      var answerList = $('#answers')
      answerList.html('');
      data.forEach(function(answer) {
        $('<li/>').appendTo(answerList).text(answer.script + ' returned ' + JSON.stringify(answer.data));
      });
      $('#alertscss > #title').text("Success!");
      $('#alertscss > #text').text("The video, will be successfully played.");
      $('#alertscss').fadeIn(400).delay(2000).fadeOut(400);
    });
  } else {
    $('#alertdcss > #title').text("Failed!");
    $('#alertdcss > #text').text("Please select an instance.");
    $('#alertdcss').fadeIn(400).delay(2000).fadeOut(400);
  }
}

function endenqueue(url) {
  if(instanceid !== '') {
    $.ajax({
      url: prefix + '/api/v1/bot/i/' + instanceid + '/scriptEvent/ytenq',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + window.localStorage.token
      },
      data: JSON.stringify(url)
    }).done(function(data) {
      // The result will be an array with answers from the script
      var answerList = $('#answers')
      answerList.html('');
      data.forEach(function(answer) {
        $('<li/>').appendTo(answerList).text(answer.script + ' returned ' + JSON.stringify(answer.data));
      });
      $('#alertscss > #title').text("Success!");
      $('#alertscss > #text').text("The video, will be successfully enqueued.");
      $('#alertscss').fadeIn(400).delay(2000).fadeOut(400);
    });
  } else {
    $('#alertdcss > #title').text("Failed!");
    $('#alertdcss > #text').text("Please select an instance.");
    $('#alertdcss').fadeIn(400).delay(2000).fadeOut(400);
  }
}

function enddownload(url) {
  if(instanceid !== '') {
    $.ajax({
      url: prefix + '/api/v1/bot/i/' + instanceid + '/scriptEvent/ytdl',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + window.localStorage.token
      },
      data: JSON.stringify(url)
    }).done(function(data) {
      // The result will be an array with answers from the script
      var answerList = $('#answers')
      answerList.html('');
      data.forEach(function(answer) {
        $('<li/>').appendTo(answerList).text(answer.script + ' returned ' + JSON.stringify(answer.data));
      });
      $('#alertscss > #title').text("Success!");
      $('#alertscss > #text').text("The video, will be successfully downloaded.");
      $('#alertscss').fadeIn(400).delay(2000).fadeOut(400);
    });
  } else {
    $('#alertdcss > #title').text("Failed!");
    $('#alertdcss > #text').text("Please select an instance.");
    $('#alertdcss').fadeIn(400).delay(2000).fadeOut(400);
  }
}
function getRootUrl() {
	return window.location.origin?window.location.origin+'/':window.location.protocol+'/'+window.location.host+'/';
}
