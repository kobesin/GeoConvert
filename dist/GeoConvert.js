var GeoConvert = {};

GeoConvert.emptyGeojson = function() {
	var geojson = {};
	geojson.type = "FeatureCollection";
	geojson.features = [];

	return geojson;
};
;
(function(window, document, undefined) {

  //xml2json
  GeoConvert.xml2Json = function(xml, toString) {
    //xml string parser
    var parseXml;

    if (window.DOMParser) {
      parseXml = function(xmlStr) {
        return (new window.DOMParser()).parseFromString(xmlStr, "text/xml");
      };
    } else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
      parseXml = function(xmlStr) {
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(xmlStr);
        return xmlDoc;
      };
    } else {
      parseXml = function() {
        return null;
      }
    }

    //check string?
    var xmlDoc;

    if (typeof xml === "string") {
      xmlDoc = parseXml(xml);
    } else if (typeof xml === "object" && xml.xmlVersion) {
      xmlDoc = xml;
    } else {
      throw new Error("Unsupported input type");
    }

    var json = xmlElement2JsonObject(xmlDoc);

    if (toString) {
      var jsonString = JSON.stringify(json);
      return jsonString;
    } else {
      return json;
    }
  };

  function xmlElement2JsonObject(xmlElement) {
    var json = {};

    if (xmlElement.attributes) {
      for (var i = 0, imax = xmlElement.attributes.length; i < imax; i++) {
        var attribute = xmlElement.attributes[i];
        var nodeValue = attribute.nodeValue;
        var value = (!isNaN(parseFloat(nodeValue)) && isFinite(nodeValue)) ? parseFloat(nodeValue) : nodeValue;
        json["@" + attribute.nodeName] = value;
      }
    }

    if (xmlElement.children.length > 0) {
      var sameNameArray = {};
      for (var i = 0, imax = xmlElement.children.length; i < imax; i++) {
        var children = xmlElement.children[i];

        if (children.tagName[0] !== "_") {
          if (json[children.tagName]) {
            if (!sameNameArray[children.tagName]) {
              json[children.tagName] = [json[children.tagName]];
              sameNameArray[children.tagName] = true;
            }
            json[children.tagName].push(xmlElement2JsonObject(children));
          } else {
            json[children.tagName] = xmlElement2JsonObject(children);
            sameNameArray[children.tagName] = false;
          }
        } else {
          if (!sameNameArray[children.tagName]) {
            json = [xmlElement2JsonObject(children)];
            sameNameArray[children.tagName] = true;
          } else {
            json.push(xmlElement2JsonObject(children));
          }
        }
      }
    } else {
      var textContent = xmlElement.textContent;
      var value = (!isNaN(parseFloat(textContent)) && isFinite(textContent)) ? parseFloat(textContent) : textContent;

      if (Object.keys(json).length > 0) {
        json["#"] = value;
      } else {
        json = value;
      }
    }

    return json;
  }

  //json2xml
  GeoConvert.json2Xml = function(json, xmlName, toString) {
    //check string?
    var jsonDoc;

    if (typeof json === "string") {
      jsonDoc = JSON.parse(json);
    } else {
      jsonDoc = json;
    }

    var docName = xmlName.trim() ? xmlName : 'root';
    var xmlDoc = document.implementation.createDocument(null, "create");
    var xml;
    xml = jsonObject2XmlElement(docName, jsonDoc, xmlDoc);

    if (toString) {
      var xmlString = "<?xml version='1.0' encoding='UTF-8'?>" + (new XMLSerializer()).serializeToString(xml);
      return xmlString;
    } else {
      return xml;
    }
  };

  function jsonObject2XmlElement(name, json, xmlDoc) {
    var xml = xmlDoc.createElement(name);

    if (json.forEach) {
      json.forEach(function(child) {
        var element = jsonObject2XmlElement('_array', child, xmlDoc);
        xml.appendChild(element);
      });
    } else if (typeof json === "object") {
      for (var key in json) {
        if (key[0] === "@") {
          var name = key.replace("@", "");

          xml.setAttribute(name, json[key]);
        } else if (key === "#") {
          xml.textContent = json[key];
        } else {
          if (typeof json[key] !== "object") {
            var element = xmlDoc.createElement(key);
            element.textContent = json[key];
            xml.appendChild(element);
          } else {
            if (json[key].forEach && json[key].sameName) {
              json[key].forEach(function(child) {
                var element = jsonObject2XmlElement(key, child, xmlDoc);
                xml.appendChild(element);
              });
            } else {
              var element = jsonObject2XmlElement(key, json[key], xmlDoc);
              xml.appendChild(element);
            }
          }
        }
      }
    } else {
      xml.textContent = json;
    }

    return xml;
  }
})(window, document);
;
(function(window, document, undefined) {
  //kml2geojson
  GeoConvert.kml2Geojson = function(kml, toString) {
    var json;

    if (typeof kml === "string") {
      if (kml.indexOf("kml:") !== -1) {
        var tempKml = kml.replace(/\kml:/gi, "");
        json = GeoConvert.xml2Json(tempKml);
      } else {
        json = GeoConvert.xml2Json(kml);
      }
    } else if (typeof kml === "object" && kml.xmlVersion) {
      json = GeoConvert.xml2Json(kml);
    } else {
      throw new Error("Unsupported input type");
    }

    var geojson = GeoConvert.emptyGeojson();
    var style = {};

    kmlElementHandle("kml", json.kml, geojson, style);

    if (toString) {
      var jsonString = JSON.stringify(geojson);
      return jsonString;
    } else {
      return geojson;
    }
  };

  function kmlElementHandle(tag, contain, geojson, style) {
    switch (tag) {
      case "kml":
      case "Document":
      case "Folder":
        for (var c in contain) {
          kmlElementHandle(c, contain[c], geojson, style)
        }
        break;
      case "Placemark":
        if (contain.forEach) {
          contain.forEach(function(placemark) {
            geojson.features.push(placemark2Feature(placemark, style));
          });
        } else {
          geojson.features.push(placemark2Feature(contain, style));
        }
        break;
      case "Style":
      case "StyleMap":
        if (contain.forEach) {
          contain.forEach(function(styleContain) {
            if (styleContain["@id"]) {
              style[styleContain["@id"]] = styleContain;
            }
          });
        } else {
          if (style["@id"]) {
            style[contain["@id"]] = contain;
          }
        }
        break;
      case "GroundOverlay":
        if (contain.forEach) {
          contain.forEach(function(groundOverlay) {
            geojson.features.push(groundOverlay2Feature(groundOverlay));
          });
        } else {
          geojson.features.push(groundOverlay2Feature(contain));
        }
        break;
    }
  }

  function groundOverlay2Feature(groundOverlay) {
    var feature = {};
    feature.type = "Feature";
    feature.properties = {};
    feature.geometry = null;

    if (groundOverlay.name) {
      feature.properties.name = groundOverlay.name;
    }
    if (groundOverlay.description) {
      feature.properties.description = groundOverlay.description;
    }

    if (groundOverlay.Icon && groundOverlay.Icon.href) {
      feature.properties.iconUrl = groundOverlay.Icon.href;
    }
    if (groundOverlay.visibility) {
      feature.properties.opacity = parseFloat(groundOverlay.visibility);
    }

    if (groundOverlay.LatLonBox) {
      latLonBox = groundOverlay.LatLonBox;
      var southWest = [parseFloat(latLonBox.south), parseFloat(latLonBox.west)];
      var northEast = [parseFloat(latLonBox.north), parseFloat(latLonBox.east)];
      var latLngBounds = [southWest, northEast];

      feature.properties.latLngBounds = latLngBounds;
    }

    return feature;
  }

  function placemark2Feature(placemark, style) {
    var feature = {};
    feature.type = "Feature";
    feature.properties = {};
    feature.style = {};

    if (placemark.name) {
      feature.properties.name = placemark.name;
    }
    if (placemark.description) {
      feature.properties.description = placemark.description;
    }

    if (placemark["gx:MultiTrack"]) {
      var geometry = {};
      var coordinates = [];

      var multiTrack = placemark["gx:MultiTrack"];
      var track = multiTrack["gx:Track"];
      var gxCoord = track["gx:coord"];

      if (gxCoord) {
        gxCoord.forEach(function(pointString) {
          if (pointString.trim() !== "") {
            var point = pointString.split(" ");
            coordinates.push([parseFloat(point[0]), parseFloat(point[1])]);
          }
        });
      }

      if (track.when) {
        feature.properties.when = track.when;
      }

      if (track.ExtendedData && track.ExtendedData.SchemaData && track.ExtendedData.SchemaData["gx:SimpleArrayData"]) {
        track.ExtendedData.SchemaData["gx:SimpleArrayData"].forEach(function(data) {
          feature.properties[data["@name"]] = data["gx:value"];
        });
      }

      geometry.type = "LineString";
      geometry.coordinates = coordinates;

      feature.geometry = geometry;
    } else {
      feature.geometry = placemark2Geometry(placemark);
    }

    var geojsonStyle;
    if (placemark.styleUrl) {
      var styleId = placemark.styleUrl.replace("#", "");
      var geojsonStyle;

      if (style[styleId]) {
        if (style[styleId].Pair) {
          var styleId2;
          style[styleId].Pair.forEach(function(style2) {
            if (style2.key && style2.key === "normal") {
              styleId2 = style2.styleUrl.replace("#", "");
            }
          });
          geojsonStyle = style[styleId2];
        } else {
          geojsonStyle = style[styleId];
        }
      }
    }

    if (geojsonStyle) {
      for (var gs in geojsonStyle) {
        switch (gs) {
          case "IconStyle":
            var iconUrl = geojsonStyle[gs].Icon.href;
            var scale = parseFloat(geojsonStyle[gs].scale);

            if (iconUrl) {
              feature.style.iconUrl = iconUrl;
            }
            if (scale) {
              feature.style.scale = scale;
            }
            if (geojsonStyle[gs].hotSpot) {
              var hotSpotX = parseFloat(geojsonStyle[gs].hotSpot["@x"]);
              var hotSpotY = parseFloat(geojsonStyle[gs].hotSpot["@y"]);
              feature.style.iconAnchor = [hotSpotX, hotSpotY];
            }
            break;
          case "LineStyle":
            var color = abgr2Color(geojsonStyle[gs].color);
            var width = parseFloat(geojsonStyle[gs].width);

            if (color) {
              feature.style.color = color.hex;
              feature.style.opacity = color.opacity;
            }
            if (width) {
              feature.style.weight = width;
            }
            break;
          case "PolyStyle":
            var color = abgr2Color(geojsonStyle[gs].color);
            var fill = parseInt(fill);
            var stroke = parseInt(geojsonStyle[gs].outline);

            if (color) {
              feature.style.fillColor = color.hex;
              feature.style.fillOpacity = color.opacity;
            }
            if (fill) {
              feature.style.fill = fill;
            }
            if (stroke) {
              feature.style.stroke = stroke;
            }
            break;
        }
      }
    }

    return feature;
  }

  function placemark2Geometry(placemark) {
    var geometry = {};

    if (placemark.Point) {
      if (placemark.Point.forEach) {
        var coordinates = [];
        placemark.Point.forEach(function(p) {
          var coordinates2 = [];
          var pointString = p.coordinates.replace(/\t|\n/gi, '');

          if (pointString.trim() !== "") {
            var point = pointString.split(",");
            coordinates2 = [parseFloat(point[0]), parseFloat(point[1])];
          }
          coordinates.push(coordinates2);
        });

        geometry.type = "MultiPoint";
        geometry.coordinates = coordinates;
      } else {
        var coordinates = [];
        var pointString = placemark.Point.coordinates.replace(/\t|\n/gi, '');

        if (pointString.trim() !== "") {
          var point = pointString.split(",");
          coordinates = [parseFloat(point[0]), parseFloat(point[1])];
        }

        geometry.type = "Point";
        geometry.coordinates = coordinates;
      }
    } else if (placemark.LineString) {
      if (placemark.LineString.forEach) {
        var coordinates = [];
        placemark.LineString.forEach(function(l) {
          var coordinates2 = [];
          var coordinatesString = l.coordinates.replace(/\t|\n/gi, '');
          coordinatesString.split(" ").forEach(function(pointString) {
            if (pointString.trim() !== "") {
              var point = pointString.split(",");
              coordinates2.push([parseFloat(point[0]), parseFloat(point[1])]);
            }
          });
          coordinates.push(coordinates2);
        });

        geometry.type = "MultiLineString";
        geometry.coordinates = coordinates;
      } else {
        var coordinates = [];
        var coordinatesString = placemark.LineString.coordinates.replace(/\t|\n/gi, '');

        coordinatesString.split(" ").forEach(function(pointString) {
          if (pointString.trim() !== "") {
            var point = pointString.split(",");
            coordinates.push([parseFloat(point[0]), parseFloat(point[1])]);
          }
        });

        geometry.type = "LineString";
        geometry.coordinates = coordinates;
      }
    } else if (placemark.Polygon) {
      if (placemark.Polygon.forEach) {
        var coordinates = [];

        placemark.Polygon.forEach(function(polygon) {
          var coordinates2 = [];
          ['outerBoundaryIs', 'innerBoundaryIs'].forEach(function(boundaryIs) {
            var boundary = polygon[boundaryIs];
            if (boundary) {
              var boundaryCoordinates = [];
              var coordinatesString = boundary.LinearRing.coordinates.replace(/\t|\n/gi, '');

              coordinatesString.split(" ").forEach(function(pointString) {
                if (pointString.trim() !== "") {
                  var point = pointString.split(",");
                  boundaryCoordinates.push([parseFloat(point[0]), parseFloat(point[1])]);
                }
              });
              coordinates2.push(boundaryCoordinates);
            }
          });
          coordinates.push(coordinates2);
        });

        geometry.type = "MultiPolygon";
        geometry.coordinates = coordinates;
      } else {
        var coordinates = [];

        ['outerBoundaryIs', 'innerBoundaryIs'].forEach(function(boundaryIs) {
          var boundary = placemark.Polygon[boundaryIs];
          if (boundary) {
            var boundaryCoordinates = [];
            var coordinatesString = boundary.LinearRing.coordinates.replace(/\t|\n/gi, '');

            coordinatesString.split(" ").forEach(function(pointString) {
              if (pointString.trim() !== "") {
                var point = pointString.split(",");
                boundaryCoordinates.push([parseFloat(point[0]), parseFloat(point[1])]);
              }
            });
            coordinates.push(boundaryCoordinates);
          }
        });

        geometry.type = "Polygon";
        geometry.coordinates = coordinates;
      }
    } else if (placemark.MultiGeometry) {
      var multiGeometry = placemark.MultiGeometry;
      if (Object.keys(multiGeometry).length > 1) {
        var geometries = [];

        for (var type in multiGeometry) {
          if (multiGeometry[type].forEach) {
            multiGeometry[type].forEach(function(tempGeometry) {
              var tempPlacemark = {};
              tempPlacemark[type] = tempGeometry;
              geometries.push(placemark2Geometry(tempPlacemark));
            });
          } else {
            var tempPlacemark = {};
            tempPlacemark[type] = multiGeometry[type];
            geometries.push(placemark2Geometry(tempPlacemark));
          }
        }

        geometry.type = "GeometryCollection";
        geometry.geometries = geometries;
      } else {
        geometry = placemark2Geometry(multiGeometry);
      }
    }

    return geometry;
  }

  function abgr2Color(abgr) {
    var color = {};
    color.hex = "#" + abgr.slice(6, 8) + abgr.slice(4, 6) + abgr.slice(2, 4);
    color.opacity = Math.round(parseInt(abgr.slice(0, 2), 16) / 255 * 100) / 100;
    return color;
  }

  //geojson2kml
  GeoConvert.geojson2Kml = function(json, toString) {
    //check string?
    var geojson;

    if (typeof json === "string") {
      geojson = JSON.parse(json);
    } else {
      geojson = json;
    }

    var kmljson = emptyKmljson();
    var placemark = [];
    var style = [];
    placemark.sameName = true;

    if (geojson.type !== "Feature" && geojson.type !== "FeatureCollection") {
      geojson = {
        type: "Feature",
        geometry: geojson,
        properties: {}
      };
    }

    geojsonElementHandle(geojson, placemark, style);
    kmljson.Document.Style = geojsonStyle2KmlStyle(style);
    kmljson.Document.Placemark = placemark;

    var kml = GeoConvert.json2Xml(kmljson, 'kml');

    if (toString) {
      var kmlString = "<?xml version='1.0' encoding='UTF-8'?>" + (new XMLSerializer()).serializeToString(kml);
      return kmlString;
    } else {
      return kml;
    }
  };

  function emptyKmljson() {
    var kmljson = {};
    kmljson["@xmlns"] = "http://www.opengis.net/kml/2.2";
    kmljson["@xmlns:gx"] = "http://www.google.com/kml/ext/2.2";
    kmljson["@xmlns:kml"] = "http://www.opengis.net/kml/2.2";
    kmljson["@xmlns:atom"] = "http://www.w3.org/2005/Atom";
    kmljson.Document = {};

    return kmljson;
  }

  function geojsonElementHandle(gObject, placemark, style) {
    switch (gObject.type) {
      case "Point":
      case "LineString":
      case "Polygon":
        var type = gObject.type;
        if (placemark[type]) {
          var tempPlacemark = geometry2Placemark(type, gObject.coordinates);

          if (!placemark[type].push) {
            placemark[type] = [placemark[type]];
            placemark[type].sameName = true;
          }
          placemark[type].push(tempPlacemark);
        } else {
          placemark[type] = geometry2Placemark(type, gObject.coordinates);
        }
        break;
      case "MultiPoint":
      case "MultiLineString":
      case "MultiPolygon":
        var type = gObject.type.replace("Multi", "");
        placemark.MultiGeometry = {};
        gObject.coordinates.forEach(function(coordinates) {
          geojsonElementHandle({
            type: type,
            coordinates: coordinates
          }, placemark.MultiGeometry);
        });
        break;
      case "GeometryCollection":
        placemark.MultiGeometry = {};
        gObject.geometries.forEach(function(geometry) {
          geojsonElementHandle(geometry, placemark.MultiGeometry);
        });
        break;
      case "Feature":
        var tempPlacemark = {};
        geojsonElementHandle(gObject.geometry, tempPlacemark);
        if (gObject.properties.name) {
          tempPlacemark.name = gObject.properties.name;
        }
        if (gObject.properties.description) {
          tempPlacemark.description = gObject.properties.description;
        }
        var styleId = featureStyle(gObject, style);
        tempPlacemark.styleUrl = styleId;
        placemark.push(tempPlacemark);
        break;
      case "FeatureCollection":
        gObject.features.forEach(function(feature) {
          geojsonElementHandle(feature, placemark, style);
        });
        break;
    }
  }

  function featureStyle(gObject, style) {
    var tempStyle = Object.assign({}, gObject.style);
    var styleId = 0;

    style.forEach(function(s, index) {
      var addStyle = false;
      for (var t in tempStyle) {
        if (tempStyle[t] !== s[t]) {
          addStyle = true;
        }
      }

      if (!addStyle) {
        styleId = (index + 1);
      }
    });

    if (styleId === 0) {
      style.push(tempStyle);
      styleId = style.length;
    }

    return "custom" + styleId;
  }

  function geometry2Placemark(type, coordinates) {
    var placemark = {};
    switch (type) {
      case "Point":
        placemark = {};
        placemark.coordinates = coordinates.join();
        break;
      case "LineString":
        placemark = {};
        placemark.tessellate = 1;
        placemark.coordinates = coordinates.join(' ');
        break;
      case "Polygon":
        placemark = {};
        placemark.tessellate = 1;
        placemark.outerBoundaryIs = {};
        placemark.outerBoundaryIs.LinearRing = {};
        placemark.outerBoundaryIs.LinearRing.coordinates = coordinates[0].join(' ');

        coordinates.shift();
        coordinates.forEach(function(coordinates) {
          placemark.innerBoundaryIs = {};
          placemark.innerBoundaryIs.LinearRing = {};
          placemark.innerBoundaryIs.LinearRing.coordinates = coordinates.join(' ');
        });
        break;
    }
    return placemark;
  }

  function geojsonStyle2KmlStyle(style) {
    var chart = {};
    chart.stroke = "outline";
    chart.fill = "fill";

    var kStyle = style.map(function(style1, index) {
      var tempStyle = {};
      tempStyle["@id"] = "custom" + (index + 1);

      for (var s in style1) {
        switch (s) {
          case "iconUrl":
          case "iconAnchor":
          case "scale":
            if (!tempStyle.IconStyle) {
              tempStyle.IconStyle = {};
            }
            break;
          case "color":
          case "weight":
            if (!tempStyle.LineStyle) {
              tempStyle.LineStyle = {};
            }
            break;
          case "stroke":
          case "fill":
          case "fillColor":
            if (!tempStyle.PolyStyle) {
              tempStyle.PolyStyle = {};
            }
            break;
        }

        switch (s) {
          case "iconUrl":
            tempStyle.IconStyle.Icon = {};
            tempStyle.IconStyle.Icon.href = style1.iconUrl;
            break;
          case "iconAnchor":
            tempStyle.IconStyle.hotSpot = {};
            tempStyle.IconStyle.hotSpot["@x"] = style1.iconAnchor[0];
            tempStyle.IconStyle.hotSpot["@y"] = style1.iconAnchor[1];
            tempStyle.IconStyle.hotSpot["@xunits"] = "pixels";
            tempStyle.IconStyle.hotSpot["@yunits"] = "pixels";
            break;
          case "scale":
            tempStyle.IconStyle.scale = style1.scale;
            break;
          case "color":
            tempStyle.LineStyle.color = color2Abgr(style1.color, style1.opacity);
            break;
          case "weight":
            tempStyle.LineStyle.width = style1.weight;
            break;
          case "stroke":
            tempStyle.PolyStyle.outline = style1.stroke;
          case "fill":
            tempStyle.PolyStyle.fill = style1.fill;
            break;
          case "fillColor":
            tempStyle.PolyStyle.color = color2Abgr(style1.fillColor, style1.fillOpacity);
            break;
        }
      }
      return tempStyle;
    });

    kStyle.sameName = true;
    return kStyle;
  }

  function color2Abgr(color, opacity) {
    color = color.replace("#", "");
    opacity = opacity ? opacity : 1;
    var a = parseInt(opacity * 255).toString(16);
    var abgr = a + color.slice(4, 6) + color.slice(2, 4) + color.slice(0, 2);
    return abgr;
  }
})(window, document);
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