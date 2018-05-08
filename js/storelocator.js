var gm = google.maps;
var map;
var geocoder;
var infowindow;
var circle;
var directionDisplay;
var directionsService = new gm.DirectionsService();
var origin_marker = null;
var storeData;
var curMarker;
var desMarker;
var curmkicon;
var desmkicon;

var initLatLng = new gm.LatLng(35.6809722, 139.766769);

/**
 * On body/APIs ready callback.
 */
function initialize() {
  initMap();
  initUI();
}

function initMap() {
  var $window = $(window), $map = $('#right'), $tabs = $('#tabs'), $tabs1 = $('#tabs-1');

  if (map) return;

  resize = function() {
             var left = $('#left').width();
             $map.css({
               left: left + 1,
               top: 0,
               width: $window.width() - left,
               height: $window.height() - 73
             })
             $tabs.css({height: $window.height() - 88})
             $tabs1.css({height: $window.height() - 123})
             map && gm.event.trigger( map, 'resize' );
  };
  
  $window.resize(resize);
  resize();

  geocoder = new gm.Geocoder();
  //吹き出し用オブジェクト
  infowindow = new google.maps.InfoWindow();

  //ルート検索結果表示用
  directionsDisplay = new gm.DirectionsRenderer({draggable: true});

  var options = {
    zoom: 14,
    center: initLatLng,
    mapTypeId: gm.MapTypeId.ROADMAP
  };
  map = new gm.Map($map[0], options);

  //ルート検索結果地図表示設定
  directionsDisplay.setMap(map);
  directionsDisplay.setPanel($("#route_result")[0]);

  //右クリックで任意ポイント追加
  gm.event.addListener(map, 'rightclick', function(event) {
    if (!origin_marker) {
      origin_marker = new gm.Marker({
        position: event.latLng,
        map: map,
        icon: "https://maps.google.com/mapfiles/marker" + String.fromCharCode(83) + ".png"		
      });
    } else {
      origin_marker.setPosition(event.latLng);
      origin_marker.setMap(map);
    }
  });
  
	curmkicon = {
		url: "images/current.png", 
		scaledSize: new google.maps.Size(15, 15), 
		origin: new google.maps.Point(0,0), 
		anchor: new google.maps.Point(0, 0) 
	};
	
	desmkicon = {
		url: "images/des.png", 
		scaledSize: new google.maps.Size(30, 30), 
		origin: new google.maps.Point(0,0), 
		anchor: new google.maps.Point(0, 0) 
	};	
	
  // 自動進め
	autocomplete = new google.maps.places.Autocomplete(
		/** @type {!HTMLInputElement} */(document.getElementById('txtAdd')),
		{types: ['geocode']});
}

/**
 * Initializes various UI features.
 */
function initUI() {
  $("#tabs").tabs();
  $("#route_result").hide();
  $('#curpos_btn').click(doCurPos);
  $('#addrsrch_btn').click(doGeocode);
  $('#nearsrch_btn').click(searchLocationsNear);
  $('#nearclear_btn').click(clearSearchResults);
  $('#allsrch_btn').click(searchLocationsAll);
  $('#curposclear_btn').click(clearUserPosition);
  $('#routeclear_btn').click(clearRoute);
  $.getJSON("store.json" , function(data) {
    var ulObj = $("#storelist");
    storeData = data;
    $.each(storeData, function(i, val) {
      val.order = i;
      var marker = createResultMarker(val);
      val.marker = marker;
      ulObj.append($("<li>").attr({"id":i}).text(val.name));
    });
  })
  .done(function(json) {
    console.log("Load JSON successfully");
  })
  .fail(function(jqXHR, textStatus, errorThrown) {
    console.log("Error：" + textStatus);
    console.log("Text：" + jqXHR.responseText);
  })
  .always(function() {
    console.log("Finish load");
  });
}

function doCurPos() {
  //ユーザーの現在の位置情報を取得
  navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
}

/***** ユーザーの現在の位置情報を取得 *****/
function successCallback(position) {
  map.panTo(new gm.LatLng(position.coords.latitude,position.coords.longitude));
  addCurMarker(new gm.LatLng(position.coords.latitude,position.coords.longitude));
}

function addCurMarker( curPos ){	
	curMarker = [];
	curMarker = new gm.Marker({
			icon:curmkicon,
			position:curPos
		});
	curMarker.setMap(map);
}

function addDesMarker( desPos ){	
	desMarker = [];
	desMarker = new gm.Marker({
			icon:desmkicon,
			position:desPos
		});
	desMarker.setMap(map);
}

/***** 位置情報が取得できない場合 *****/
function errorCallback(error) {
  var err_msg = "";
  switch(error.code)
  {
    case 1:
      err_msg = "Have not permission to get location information!";
      break;
    case 2:
      err_msg = "Can not get device location!";
      break;
    case 3:
      err_msg = "Timeout!";
      break;
  }
  alert(err_msg);
}

/***** ジオコーディング実施 *****/
function doGeocode() {
  var address = $('#txtAdd').val();
  if (geocoder) {
    geocoder.geocode( {'address': address}, function(results, status) {
      if (status == gm.GeocoderStatus.OK) {
        map.setCenter(results[0].geometry.location);		
		// add destination marker
		addDesMarker(results[0].geometry.location);
      } else {
        alert("Can not found address：" + status);
      }
    });
  }
}

/***** 半径検索 *****/
function searchLocationsNear() {
  //ルート検索結果表示クリア
  //reset();
  //reset2();
  //顧客検索結果表示クリア
  clearSearchResults();
  var center = map.getCenter();
  var radius = $('#radiusSelect').val();
  var rFlg = 0;
  var ulObj = $("#storelist");
  
  $.each(storeData, function(i, val) {
    if (gm.geometry.spherical.computeDistanceBetween(center, val.marker.getPosition()) < radius) {
      val.marker.setMap(map);
      ulObj.append($("<li>").attr({"id":i}).text(val.name));
      rFlg = 1;
    }
  });
  if (rFlg == 0) alert('Can not found stores');

  // Draw the circle on map
  drawCircle();
}

/***** 全て表示 *****/
function searchLocationsAll() {
  //ルート検索結果表示クリア
  //reset();
  //reset2();
  //顧客検索結果表示クリア
  clearSearchResults();
  var ulObj = $("#storelist");
  
  $.each(storeData, function(i, val) {
    val.marker.setMap(map);
    ulObj.append($("<li>").attr({"id":i}).text(val.name));
  });
}

/***** 顧客地図表示用マーカー作成 *****/
function createResultMarker(result) {
  var resultLatLng = new gm.LatLng(result.lat, result.lng);
  //マーカーオブジェクト作成
  var marker = new gm.Marker({
    position: resultLatLng,
    title: result.name,
    map: map
  });
  //マーカークリックで吹き出し表示
  gm.event.addListener(marker, 'click', function() {
    var btn1 = '<input type="submit" id="route_btn" class="srch_btn" onclick="calcRoute('+result.order+')" value="Display route"/>';
    var content = '<table border="1" cellspacing="0" cellpadding="5" bordercolor="#333333">'+
                  '<tr><td bgcolor="#99CC00" align="left" nowrap>店舗名</td><td bgcolor="#FFFFFF" valign="top">'+result.name+'</td></tr>'+
                  '<tr><td bgcolor="#99CC00" align="left" nowrap>住所</td><td bgcolor="#FFFFFF" valign="top">'+result.address+'</td></tr>'+
                  '</table>'+btn1;
    infowindow.setContent(content);
    infowindow.open(map, marker);
  });

  return marker;
}

/***** 顧客検索結果表示クリア *****/
function clearSearchResults() {
  $.each(storeData, function(i, val) {
    val.marker.setMap(null);
  });
  $("#storelist").text("");
  clearCircle();
}

/***** 検索範囲円表示 *****/
function drawCircle() {
  var radius = $('#radiusSelect').val();
  var circleOptions = {
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.35,
    map: map,
    center: map.getCenter(),
    radius: parseInt(radius)
  };
  circle = new gm.Circle(circleOptions);
  gm.event.addListener(circle, "rightclick", function(event){
    gm.event.trigger(map, 'rightclick', event);
  });
}

/***** 検索範囲円表示クリア *****/
function clearCircle() {
  if (circle) {
    circle.setMap(null);
    circle = null;
  }
}

function clearUserPosition() {
  if (origin_marker) origin_marker.setMap(null);
  origin_marker = null;
}

function calcRoute(i) {
  infowindow.close();
  if (origin_marker == null) {
    alert("Right Click on the map to add a user position");
    return;
  }
  
  var request = {
      origin: origin_marker.getPosition(),
      destination: storeData[i].marker.getPosition(),
      travelMode: gm.DirectionsTravelMode.DRIVING,
      optimizeWaypoints: true
  };
  
  directionsService.route(request, function(response, status) {
    if (status == gm.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
    }
  });
  $("#storelist").hide();
  $("#route_result").show();
}

function clearRoute() {
  directionsDisplay.setMap(null);
  directionsDisplay.setPanel(null);
  directionsDisplay = new gm.DirectionsRenderer({draggable: true});
  directionsDisplay.setMap(map);
  directionsDisplay.setPanel($("#route_result")[0]);
  $("#route_result").hide();
  $("#storelist").show();
}

