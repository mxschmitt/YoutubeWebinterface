var maxResults = 6;
var nextPageToken, instanceid, ytapikey, ytapi_state = 0;

function tplawesome(e, t) {
  var res = e;
  for (var n = 0; n < t.length; n++) {
    res = res.replace(/\{\{(.*?)\}\}/g, function(e, r) {
      return t[n][r];
    });
  }
  return res;
}

function resetVideoHeight() {
  $(".video").css("height", $("#results").width() * 9 / 16);
}

function ytinit() {
  if (ytapi_state == 0) {
    ytapi_state = 1; // loaded
  }

  if (typeof ytapikey != 'undefined') {
    if (ytapikey.length == 39) {
      gapi.client.setApiKey(ytapikey);
      gapi.client.load("youtube", "v3", function() {});
      ytapi_state = 2; // enabled
      ytapikey = "";
       // console.log("youtube api enabled.");
    } else {
      console.log("invalid api key!");
    }
  } else {
      // console.log("no api key set");
  }
}

$(document).ready(function() {
    console.log("ready");
  var instanceList = $('#dropdown');
  // Get the list of instances using the currently logged in user account
  $.ajax({
    url: '/api/v1/bot/instances',
    headers: {
      'Authorization': 'bearer ' + window.localStorage.token
    },
    statusCode: {
      401: function() {
        swal({
          title: 'Error',
          text: "In order for you to access this you have to be logged in.",
          type: 'warning',
          confirmButtonColor: '#D9230F',
          confirmButtonText: 'Webinterface',
          closeOnConfirm: false,
        }).then(function() {
          window.location = getRootUrl();
        });
      }
    }
  }).done(function(data) {
    data = data.sort(dynamicSort("nick"));

    // get instance from cookie
    if(checkCookie('instanceid') == true) {
      data.forEach(function(instance) {
        if(instance.uuid == getCookie('instanceid')) {
          instanceid = instance.uuid;
          getConfig(instance.uuid);
          $("#dropdb1").html(instance.nick);
        }
      });
    }

    data.forEach(function(instance) { // go through every instance
      // append instance list
      $('<li/>').appendTo(instanceList).html('<a href="#">' + instance.nick + '</a>').click(function() {
        setCookie('instanceid', instance.uuid, 7);
        getConfig(instance.uuid);
        instanceid = instance.uuid;
      });

      // get ytapikey
      $.ajax({
        url: '/api/v1/bot/i/' + instance.uuid + '/scriptEvent/ytapikey',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + window.localStorage.token
        },
        data: "{}"
      }).done(function(data) {
        data.forEach(function(answer) {
          // // console.log("ytapikey: " + answer.data);
          if (typeof answer.data !== 'undefined') {
            ytapikey = answer.data;

            if (ytapi_state == 1) { // initialize ytapi if loaded but not already enabled
              ytinit();
            }
          }
        });
      }); // end get ytapikey
    });

    $('.dropd1 > li > a').click(function() { // apply dropdown selection
      $("#dropdb1").html($(this).text() + ' <span class="caret"></span>');
    });
  });

  /* infinite scroll */

  $(window).scroll(function() {
    if($(window).scrollTop() == $(document).height() - $(window).height()) {
      if(typeof nextPageToken !== 'undefined') {
        moreVideos();
      }
    }
  });

  /* load more button */

  $("#loadmore").click(function() {
    if(typeof nextPageToken !== 'undefined') {
      moreVideos();
    }
  });

  /* search button */

  $("form").on("submit", function(e) {
    e.preventDefault();
    if($("#search").val()) {
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
          $.get("src/template/yt.html", function(data) {
            $("#results").append(tplawesome(data, [{
              "title": item.snippet.title,
              "videoid": item.id.videoId
            }]));
          });
        });
        console.log(initLabel());
        resetVideoHeight();
        $("#loadmore").css("display", "block");
      });
    } else {
      sweetAlert('Failed...', "Be sure, that you´ve entered a search term!", 'error');
    }
  });
  $(window).on("resize", resetVideoHeight);
}); //Document Ready End

/* get config from a instance */

function getConfig(instance) {
  $.ajax({
    url: '/api/v1/bot/i/' + instance + '/scriptEvent/ytwebconfig',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'bearer ' + window.localStorage.token
    },
    data: '{}'
  }).done(function(data) {
    data.forEach(function(answer) {
      // console.log("config:");
      // console.log(answer.data);

      var css = '.play { display: ' + (answer.data.play ? 'inline-block' : 'none') + "; margin-left: 15px !important; }\n" +
          '.download { display: ' + (answer.data.download ? 'inline-block' : 'none') + "; margin-left: 15px !important; }\n" +
          '.enqueue { display: ' + (answer.data.enqueue ? 'inline-block' : 'none') + "; margin-left: 15px !important; }\n";

      // console.log("css: " + css);

      $("#btn-style").html(css);
    });
  });
}

function endplay(url) {
  if(typeof instanceid !== 'undefined') {
    $.ajax({
      url: '/api/v1/bot/i/' + instanceid + '/scriptEvent/ytplay',
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
      var answerList = $('#answers');
      answerList.html('');
      data.forEach(function(answer) {
        $('<li/>').appendTo(answerList).text(answer.script + ' returned ' + JSON.stringify(answer.data));
      });
      if(data[0].data.includes('not enabled')) {
        createAlertBox('error', data[0].data);
      } else {
        createAlertBox('success', data[0].data);
      }
    });
  } else {
    selectInstance();
  }
}

function endenqueue(url) {
  if(typeof instanceid !== 'undefined') {
    $.ajax({
      url: '/api/v1/bot/i/' + instanceid + '/scriptEvent/ytenq',
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
      var answerList = $('#answers');
      answerList.html('');
      data.forEach(function(answer) {
        $('<li/>').appendTo(answerList).text(answer.script + ' returned ' + JSON.stringify(answer.data));
      });
      if(data[0].data.includes('not enabled')) {
        createAlertBox('error', data[0].data);
      } else {
        createAlertBox('success', data[0].data);
      }
    });
  } else {
    selectInstance();
  }
}

function enddownload(url) {
  if(typeof instanceid !== 'undefined') {
    $.ajax({
      url: '/api/v1/bot/i/' + instanceid + '/scriptEvent/ytdl',
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
      if(data[0].data.includes('not enabled')) {
        createAlertBox('error', data[0].data);
      } else {
        createAlertBox('success', data[0].data);
      }
    });
  } else {
    selectInstance();
  }
}

function getRootUrl() {
  return window.location.origin ? window.location.origin + '/' : window.location.protocol + '/' + window.location.host + '/';
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
      $.get("src/template/yt.html", function(data) {
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
  sweetAlert('Failed...', "Be sure, that you've enabled the script in your Webinterface!", 'error');
}

function selectInstance() {
  sweetAlert('Failed...', "Be sure, that you select an instance!", 'error');
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toGMTString();
  document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while(c.charAt(0) == ' ') c = c.substring(1);
    if(c.indexOf(name) == 0) return c.substring(name.length, c.length);
  }
  return "";
}

function checkCookie(cname) {
  var user = getCookie(cname);
  if(user != "") {
    return true;
  } else {
    return false;
  }
}

function createAlertBox(type, text) {
  // reset classes
  $('div > #alertscss').removeClass("alert-success");
  $('div > #alertscss').removeClass("alert-danger");
  $('div > #alertscss').removeClass("alert-warning");

  if(type == 'success') {
    $('div > #alertscss').addClass("alert-success");
    $('#alertscss > #title').text("Success!");
  } else if(type == 'error') {
    $('div > #alertscss').addClass("alert-danger");
    $('#alertscss > #title').text("Error!");
  } else if(type == 'warning') {
    $('div > #alertscss').addClass("alert-warning");
    $('#alertscss > #title').text("Warning!");
  } else {
    return false;
  }

  // add text and animate
  $('#alertscss > #text').text(text);
  $('#alertscss').fadeIn(400).delay(2000).fadeOut(400);
  return true;
}
function initLabel() {
    console.log("triggered");
    var v = document.getElementsByClassName("youtube-player");
    for (var n = 0; n < v.length; n++) {
        var p = document.createElement("div");
        p.innerHTML = labnolThumb(v[n].dataset.id);
        p.onclick = labnolIframe;
        v[n].appendChild(p);
    }
}
 
function labnolThumb(id) {
    return '<img class="youtube-thumb" src="//i.ytimg.com/vi/' + id + '/hqdefault.jpg"><div class="play-button"></div>';
}
 
function labnolIframe() {
    var iframe = document.createElement("iframe");
    iframe.setAttribute("src", "//www.youtube.com/embed/" + this.parentNode.dataset.id + "?autoplay=1&autohide=2&border=0&wmode=opaque&enablejsapi=1&controls=0&showinfo=0");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("id", "youtube-iframe");
    iframe.classList.add("ytframe");
    this.parentNode.replaceChild(iframe, this);
}