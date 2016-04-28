//-------------CONFIG-START------------
var maxResults = 6;
//-------------CONFIG-END--------------
var prefix = '', nextPageToken, instanceid = '';

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

    if ($("#search").val()) {
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
        $("#loadmore").css("display", "block");
      });
    } else {
        noSelectedVideo();
    }
  });
  $(window).on("resize", resetVideoHeight);
});

function resetVideoHeight() {
  $(".video").css("height", $("#results").width() * 9 / 16);
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
        makeError();
      }
    }
  }).done(function(data) {
    data = data.sort(dynamicSort("nick"));
    data.forEach(function(instance) {
      // When clicking an entry, we post a request to the script interface and return the result
      $('<li/>').appendTo(instanceList).html('<a href="#">' + instance.nick + '</a>').click(function() {
        setCookie('instanceid',instance.uuid,7);
      });
      
      $.ajax({
        url: '/api/v1/bot/i/' + instance.uuid + '/scriptEvent/ytkey',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + window.localStorage.token
        },
        data: "{}"
      }).done(function(data) {
        data.forEach(function(answer) {
          if (answer.data.length == 39) {
            gapi.client.setApiKey(answer.data);
            gapi.client.load("youtube", "v3", function() {});
          }
        });
      });
    });
    
    $('.dropd1 > li > a').click(function() {
      $("#dropdb1").html($(this).text() + ' <span class="caret"></span>');
    });
    
    checkForInstance(data);
  });
  
  $(window).scroll(function(){
    if ($(window).scrollTop() == $(document).height() - $(window).height()) {
      if (typeof nextPageToken !== 'undefined') {
        moreVideos();
      }
    }
  });
  
  $("#loadmore").click(function() {
    if (typeof nextPageToken !== 'undefined') {
      moreVideos();
    }
  });
}); //Document Ready End

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
      if(data.length == 0) {
        enablePlugin();
        return;
      }
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
      selectInstance();
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
      if(data.length == 0) {
        enablePlugin();
        return;
      }
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
      selectInstance();
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
      if(data.length == 0) {
        enablePlugin();
        return;
      }
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
      selectInstance();
  }
}

function getRootUrl() {
  return window.location.origin ? window.location.origin + '/' : window.location.protocol + '/' + window.location.host + '/';
}

function makeError() {
  swal({
    title: 'Oops...',
    text: "For the Webinterface, you must be logged in with your Account into the Sinusbot Webinterface!",
    type: 'warning',
    confirmButtonColor: '#D9230F',
    confirmButtonText: 'to the Webinterface',
    cancelButtonText: 'Webinterface',
    closeOnConfirm: false,
  }).then(function(isConfirm) {
    if(isConfirm === true) {
      swal('Redirect!', 'You will be redirected to you Webinterface.', 'success');
      setTimeout(function() {
        window.location = getRootUrl();
      }, 1600);
    } else {
      swal('Cancelled', 'You will be redirected to you Webinterface.', 'error');
      setTimeout(function() {
        window.location = getRootUrl();
      }, 1600);
    }
  });
}

function checkForInstance(data) {
    if (checkCookie('instanceid') == true) {
        i = 0;
        data.forEach(function(instance) {
            if (instance.uuid == getCookie('instanceid')) {
//                console.log(i);
                instanceid = data[i].uuid;
//                console.log(data[i].nick);
                $("#dropdb1").html(data[i].nick);
            }
            i++;
        });
    }
}

function moreVideos() {
        $("#loadmorecss").removeClass("none");
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
      $.each(result.items, function(index, item) {
        $.get("src/yt.html", function(data) {
          $("#results").append(tplawesome(data, [{
            "title": item.snippet.title,
            "videoid": item.id.videoId
          }]));
        });
      });
      resetVideoHeight();
      $("#loadmorecss").addClass("none");
    });

}

function dynamicSort(property) {
  var sortOrder = 1;
  if(property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function(a, b) {
    var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
    return result * sortOrder;
  }
}

function enablePlugin() {
  sweetAlert('Failed...', "Be sure, that you've enabled the script in your Webinterface!", 'error')
}
function selectInstance() {
  sweetAlert('Failed...', "Be sure, that you select an instance!", 'error')
}
function noSelectedVideo() {
  sweetAlert('Failed...', "Be sure, that you´ve entered a search term!", 'error')
}
function setCookie(cname,cvalue,exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname+"="+cvalue+"; "+expires;
}
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}
function checkCookie(cname) {
    var user = getCookie(cname);
    if (user != "") {
       return true;
    } else {
        return false;
    }
}
