;
(function(window, document, undefined) {
  //kml2geojson
  GeoConvert.gpx2Geojson = function(gpx, toString) {
    var json;

    if (typeof gpx === "string") {
      json = GeoConvert.xml2Json(gpx);
    } else if (typeof gpx === "object" && gpx.xmlVersion) {
      json = GeoConvert.xml2Json(gpx);
    } else {
      throw new Error("Unsupported input type");
    }

    var geojson = GeoConvert.emptyGeojson();
    gpxElementHandle("gpx", json.gpx, geojson);

    if (toString) {
      var jsonString = JSON.stringify(geojson);
      return jsonString;
    } else {
      return geojson;
    }
  };

  function gpxElementHandle(tag, contain, geojson) {
    if (tag === "gpx") {
      for (var c in contain) {
        gpxElementHandle(c, contain[c], geojson);
      }
    } else {
      var gpxDataHandle;
      switch (tag) {
        case "wpt":
          gpxDataHandle = waypoint2Features;
          break;
        case "trk":
          gpxDataHandle = trackpoint2Features;
          break;
        case "rte":
          gpxDataHandle = route2Features;
          break;
      }

      if (gpxDataHandle) {
        if (contain.forEach) {
          contain.forEach(function(c) {
            geojson.features.push(gpxDataHandle(c));
          });
        } else {
          geojson.features.push(gpxDataHandle(contain));
        }
      }
    }
  }

  function waypoint2Features(contain) {
    var feature = {};
    feature.type = "Feature";
    feature.properties = {};
    feature.properties.name = contain.name;
    feature.properties.cmt = contain.cmt;
    feature.properties.desc = contain.desc;
    feature.properties.time = contain.time;

    feature.geometry = {};
    feature.geometry.type = "Point";

    var coordinates = [contain["@lon"], contain["@lat"]];
    feature.geometry.coordinates = coordinates;

    return feature;
  }

  function trackpoint2Features(contain) {
    var feature = {};
    feature.type = "Feature";
    feature.properties = {};
    feature.properties.name = contain.name;

    feature.geometry = {};
    var coordinates;
    if (contain.trkseg && contain.trkseg.trkpt) {
      var trkpts = contain.trkseg.trkpt;
      if (trkpts.forEach) {
        feature.geometry.type = "LineString";
        coordinates = [];
        trkpts.forEach(function(trkpt) {
          var point = [trkpt["@lon"], trkpt["@lat"]];
          coordinates.push(point);
        });
      } else {
        feature.geometry.type = "Point";
        coordinates = [trkpts["@lon"], trkpts["@lat"]];
      }
    }
    feature.geometry.coordinates = coordinates;

    return feature;
  }

  function route2Features(contain) {
    var feature = {};
    feature.type = "Feature";
    feature.properties = {};
    feature.properties.name = contain.name;

    feature.geometry = {};
    var coordinates;
    if (contain.rtept) {
      var rtepts = contain.rtept;
      if (rtepts.forEach) {
        feature.geometry.type = "LineString";
        coordinates = [];
        rtepts.forEach(function(trkpt) {
          var point = [trkpt["@lon"], trkpt["@lat"]];
          coordinates.push(point);
        });
      } else {
        feature.geometry.type = "Point";
        coordinates = [rtepts["@lon"], rtepts["@lat"]];
      }
    }
    feature.geometry.coordinates = coordinates;

    return feature;
  }

  //geojson2kml
  GeoConvert.geojson2Gpx = function(json, toString) {
    //check string?
    var geojson;

    if (typeof json === "string") {
      geojson = JSON.parse(json);
    } else {
      geojson = json;
    }

    var gpxjson = emptyGpxjson();
    var waypoint = [];
    var route = [];
    waypoint.sameName = true;
    route.sameName = true;

    if (geojson.type !== "Feature" && geojson.type !== "FeatureCollection") {
      geojson = {
        type: "Feature",
        geometry: geojson,
        properties: {}
      };
    }

    geojsonElementHandle(geojson, waypoint, route);
    gpxjson.wpt = waypoint;
    gpxjson.rte = route;

    var gpx = GeoConvert.json2Xml(gpxjson, 'gpx');

    if (toString) {
      var gpxString = "<?xml version='1.0' encoding='UTF-8'?>" + (new XMLSerializer()).serializeToString(gpx);
      return gpxString;
    } else {
      return gpx;
    }
  };

  function emptyGpxjson() {
    var gpxjson = {};
    gpxjson["@xmlns"] = "http://www.topografix.com/GPX/1/1";
    gpxjson["@version"] = "1.1";
    gpxjson["@creator"] = "GeoConvert";

    gpxjson.metadata = {};
    gpxjson.metadata.name = "Geojson to GPX";

    return gpxjson;
  }

  function geojsonElementHandle(gObject, waypoint, route, properties) {
    switch (gObject.type) {
      case "Point":
        var wpt = point2Waypoint(gObject.coordinates);
        wpt.name = properties.name ? properties.name : "";
        waypoint.push(wpt);
        break;
      case "LineString":
        var rte = lineString2Route(gObject.coordinates);
        rte.name = properties.name ? properties.name : "";
        route.push(rte);
        break;
      case "MultiPoint":
      case "MultiLineString":
        var type = gObject.type.replace("Multi", "");
        gObject.coordinates.forEach(function(coordinates) {
          geojsonElementHandle({
            type: type,
            coordinates: coordinates
          }, waypoint, route, properties);
        });
        break;
      case "GeometryCollection":
        gObject.geometries.forEach(function(geometry) {
          geojsonElementHandle(geometry, waypoint, route, properties);
        });
        break;
      case "Feature":
        geojsonElementHandle(gObject.geometry, waypoint, route, gObject.properties);
        break;
      case "FeatureCollection":
        gObject.features.forEach(function(feature) {
          geojsonElementHandle(feature, waypoint, route);
        });
        break;
    }
  }

  function point2Waypoint(coordinates) {
    var waypoint = {};
    waypoint["@lon"] = coordinates[0];
    waypoint["@lat"] = coordinates[1];

    return waypoint;
  }

  function lineString2Route(coordinates) {
    var route = {};
    route.rtept = [];
    route.rtept.sameName = true;
    coordinates.forEach(function(coordinates) {
      var rtept = {};
      rtept["@lon"] = coordinates[0];
      rtept["@lat"] = coordinates[1];
      route.rtept.push(rtept);
    });

    return route;
  }
})(window, document);