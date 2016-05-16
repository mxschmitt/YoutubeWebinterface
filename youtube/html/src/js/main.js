var maxResults = 6;
var nextPageToken, instanceid, ytapikey, InstanceStatus, ytapi_state = 0;

function tplawesome(e, t) {
  var res = e;
  for(var n = 0; n < t.length; n++) {
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
  if(ytapi_state == 0) {
    ytapi_state = 1; // loaded
  }
  if(typeof ytapikey != 'undefined') {
    if (ytapikey.length == 39) {
      gapi.client.setApiKey(ytapikey);
      gapi.client.load("youtube", "v3", function() {});
      ytapi_state = 2;
      ytapikey = "";
      console.log("youtube api enabled.");
    } else {
      console.log("invalid api key!");
      sweetAlert('Failed...', "Be sure, that your API Key is correct, and you have no Server API Key instead of a Browser Key!", 'error');
    }
  } else {
    // console.log("no api key set");
  }
}
$(document).ready(function() {
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
          closeOnConfirm: false
        }).then(function() {
          window.location = getRootUrl();
        });
      }
    }
  }).done(function(data) {
    data = data.sort(dynamicSort("name"));
    // get instance from cookie
    if(checkCookie('instanceid') == true) {
      data.forEach(function(instance) {
        if(instance.uuid == getCookie('instanceid')) {
          instanceid = instance.uuid;
          getConfig(instance.uuid);
          $("#dropdb1").html(instance.name?instance.name:instance.nick);
        }
      });
    }
    data.forEach(function(instance) { // go through every instance
      // append instance list
      $('<li/>').appendTo(instanceList).html('<a href="#">' + (instance.name?instance.name:instance.nick) + '</a>').click(function() {
        setCookie('instanceid', instance.uuid, 7);
        getConfig(instance.uuid);
        instanceid = instance.uuid;
        getInstanceStatus();
      });
    });

    getInstanceStatus();
    setInterval(function() {
      getInstanceStatus();
    }, 5000);
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

    if (typeof instanceid != 'undefined') {
      if (ytapi_state == 2) {
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
                bindThumbEvent();
              });
            });
            resetVideoHeight();
            $("#loadmore").css("display", "block");
          });
        } else {
          sweetAlert('Error', "You have to type something in the searchbar", 'error');
        }
      } else {
        sweetAlert('YouTube Api Error', "Please make sure that you've set a valid api key in the config and <u>enabled the script on the selected instance</u>.", 'error');
      }
    } else {
      sweetAlert('Error', "Please select an instance before searching", 'error');
    }
  });
  $(window).on("resize", resetVideoHeight);
  initVolumeBar();
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
    if(data.length == 0) {
      var css = '.play { display: none' + "}\n" + '.download { display: none' + "}\n" + '.enqueue { display: none' + "}\n" + '#spanover5px { display: none' + "}\n";
      console.log("config not set");
    } else {
      ytapikey = data[0].data.ytapikey;
      if (ytapi_state == 1) { // initialize ytapi if loaded but not already enabled
        ytinit();
      }
      var css = '.play { display: ' + (data[0].data.play ? 'inline-block' : 'none') + "}\n" + '.download { display: ' + (data[0].data.download ? 'inline-block' : 'none') + "}\n" + '.enqueue { display: ' + (data[0].data.enqueue ? 'inline-block' : 'none') + "}\n";
    }
    $("#btn-style").html(css);
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
        bindThumbEvent();
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

function notEnoughPermissions() {
  sweetAlert('Failed...', "Be sure, that you have enough permissions to execute that action!", 'error');
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

function bindThumbEvent() {
  // unbind previous event
  $('.youtube-thumb, .play-button').unbind('click');
  // load video when clicking on thumbnail
  $('.youtube-thumb, .play-button').click(function() {
    var parent = $(this).parent().parent();
    var url = '//www.youtube.com/embed/' + parent.data('videoid') + '?autoplay=1&autohide=2&border=0&wmode=opaque&enablejsapi=1&showinfo=0';
    parent.html('<iframe src="' + url + '" frameborder="0" scrolling="no" id="youtube-iframe" allowfullscreen></iframe>');
  });
  var prevHeight = 0;
  var prevElement;
  var i = 0;
  $('.videos > h3').each(function() {
    if(i % 2 == 0) {
      prevHeight = $(this).innerHeight();
      prevElement = this;
    } else {
      var currHeight = $(this).innerHeight();
      if(prevHeight > currHeight) {
        $(this).innerHeight(prevHeight);
      } else if(prevHeight < currHeight) {
        $(prevElement).innerHeight(currHeight);
      }
    }
    i++;
  });
}
function getInstanceStatus() {
  if (typeof instanceid != 'undefined') {
    $.ajax({
      url: '/api/v1/bot/i/' + instanceid + '/status',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + window.localStorage.token
      },
      statusCode: {
        401: function() {
          console.log("not enough permissions for getting the status");
        }
      }
    }).done(function(data) {
      InstanceStatus = data;
      changeValBtn = document.querySelector('.v-slider');
      inputRange = changeValBtn.parentNode.querySelector('input[type="range"]');
      inputRange.value = data.volume;
      inputRange.dispatchEvent(new Event('change'));
      
      if (data.currentTrack != null && typeof data.currentTrack.title != 'undefined') {
        $('#v-title').text(data.currentTrack.title ? data.currentTrack.title : '');
        $('#v-artist').text(data.currentTrack.artist ? data.currentTrack.artist : '');
      } else {
        $('#v-title').text('');
        $('#v-artist').text('');
      }

      if(data.repeat == true) {
        $('#v-retweet').addClass('enabled')
      } else {
        $('#v-retweet').removeClass('enabled');
      }
      if (data.playlistTrack == -1) {
        $('#v-random').addClass('enabled')
      } else {
          if (data.shuffle == true) {
            nbr = 0;
            $('#v-random').addClass('enabled')
          } else {
            nbr = 1;
            $('#v-random').removeClass('enabled')
          }
      }
      if(data.playing == true) {
        $('#va-play').removeClass("glyphicon-play").addClass("glyphicon-stop");
      } else {
        $('#va-play').removeClass("glyphicon-stop").addClass("glyphicon-play");
      }
    });
  }
}

function initVolumeBar() {
  var selector = '[data-rangeSlider]',
    elements = document.querySelectorAll(selector);
  rangeSlider.create(elements, {
    onInit: function() {},
    onSlideEnd: function(value, percent, position) {
      $.ajax({
        url: '/api/v1/bot/i/' + instanceid + '/volume/set/' + value,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + window.localStorage.token
        },
        statusCode: {
          401: function() {
            notEnoughPermissions();
          },
          403: function() {
            notEnoughPermissions();
          }
        }
      }).done(function(data) {
        getInstanceStatus();
      });
    }
  });
}
// Control events  
function vforward() {
  $.ajax({
    url: '/api/v1/bot/i/' + instanceid + '/playNext',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'bearer ' + window.localStorage.token
    },
    statusCode: {
      401: function() {
        notEnoughPermissions();
      },
      403: function() {
        notEnoughPermissions();
      }
    }
  });
  getInstanceStatus();
}

function vbackward() {
  $.ajax({
    url: '/api/v1/bot/i/' + instanceid + '/playPrevious',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'bearer ' + window.localStorage.token
    },
    statusCode: {
      401: function() {
        notEnoughPermissions();
      },
      403: function() {
        notEnoughPermissions();
      }
    }
  });
  getInstanceStatus();
}

function vplay() {
  if(InstanceStatus.playing == true) {
    $('#va-play').removeClass("glyphicon-stop").addClass("glyphicon-play");
    $.ajax({
      url: '/api/v1/bot/i/' + instanceid + '/pause',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + window.localStorage.token
      },
      statusCode: {
        401: function() {
          notEnoughPermissions();
        },
        403: function() {
          notEnoughPermissions();
        }
      }
    });
  } else {
    $('#va-play').removeClass("glyphicon-play").addClass("glyphicon-stop");
    $.ajax({
      url: '/api/v1/bot/i/' + instanceid + '/play/byId/' + InstanceStatus.currentTrack.uuid,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + window.localStorage.token
      },
      statusCode: {
        401: function() {
          notEnoughPermissions();
        },
        403: function() {
          notEnoughPermissions();
        }
      }
    });
  }
  getInstanceStatus();
}

function vshuffle() {
  if (InstanceStatus.playlistTrack == -1) {
    $('#v-random').addClass('enabled')
  } else {
      if (InstanceStatus.shuffle == true) {
        nbr = 0;
        $('#v-random').addClass('enabled')
      } else {
        nbr = 1;
        $('#v-random').removeClass('enabled')
      }
  }
  if (InstanceStatus.playlistTrack != -1) {
    $.ajax({
      url: '/api/v1/bot/i/' + instanceid + '/shuffle/' + nbr,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + window.localStorage.token
      },
      statusCode: {
        401: function() {
          notEnoughPermissions();
        },
        403: function() {
          notEnoughPermissions();
        }
      }
    });
  } else {
    swal("Warning...", "Shuffle cannot be deactivated if no playlist is active.", "warning")
  }
  getInstanceStatus();
}

function vrepeat() {
  if(InstanceStatus.repeat == true) {
    nbr = 0;
    $('#v-retweet').removeClass('enabled');
  } else {
    nbr = 1;
    $('#v-retweet').addClass('enabled');
  }
  $.ajax({
    url: '/api/v1/bot/i/' + instanceid + '/repeat/' + nbr,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'bearer ' + window.localStorage.token
    },
    statusCode: {
      401: function() {
        notEnoughPermissions();
      },
      403: function() {
        notEnoughPermissions();
      }
    }
  });
  getInstanceStatus();
};