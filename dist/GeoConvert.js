var GeoConvert = {};

GeoConvert.emptyGeojson = function() {
	var geojson = {};
	geojson.type = "FeatureCollection";
	geojson.features = [];

	return geojson;
};

GeoConvert.decode = {};
GeoConvert.decode.utf8 = new TextDecoder("utf-8");
GeoConvert.decode.big5 = new TextDecoder("big5");
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
        if (!contain.forEach) {
          var keys = Object.keys(contain);

          var styleIndex = keys.indexOf("Style");
          if (styleMapIndex > -1) {
            keys.splice(styleMapIndex, 1);
            kmlElementHandle("StyleMap", contain.StyleMap, geojson, style);
          }

          var styleMapIndex = keys.indexOf("StyleMap");
          if (styleIndex > -1) {
            keys.splice(styleIndex, 1);
            kmlElementHandle("Style", contain.Style, geojson, style);
          }

          keys.forEach(function(c) {
            kmlElementHandle(c, contain[c], geojson, style);
          });
        } else {
          contain.forEach(function(c) {
            kmlElementHandle(tag, c, geojson, style);
          });
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
          if (contain["@id"]) {
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
    
    if (placemark["gx:Track"] || placemark["gx:MultiTrack"]) {
      var geometry = {};
      var coordinates = [];

      var multiTrack = placemark["gx:MultiTrack"];
      var track = multiTrack ? multiTrack["gx:Track"] : placemark["gx:Track"];
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

    var geojsonStyle = placemark.Style || {};
    if (placemark.styleUrl) {
      var styleId = placemark.styleUrl.replace("#", "");

      if (style[styleId]) {
        var mStyle;
        var styleId2;

        if (style[styleId].Pair) {
          style[styleId].Pair.forEach(function(style2) {
            if (style2.key && style2.key === "normal") {
              styleId2 = style2.styleUrl.replace("#", "");
            }
          });
          mStyle = style[styleId2];
        } else {
          mStyle = style[styleId];
        }

        var tempKeys = Object.keys(Object.assign({}, geojsonStyle, mStyle));
        tempKeys.forEach(function(tk) {
          var type = typeof geojsonStyle[tk];
          if (type === "object") {
            geojsonStyle[tk] = Object.assign({}, geojsonStyle[tk], mStyle[tk]);
          } else if (type === "undefined") {
            geojsonStyle[tk] = mStyle[tk];
          }
        });
      }
    }

    for (var styleKey in geojsonStyle) {
      switch (styleKey) {
        case "IconStyle":
          var iconUrl = geojsonStyle.IconStyle.Icon.href;
          var scale = geojsonStyle.IconStyle.scale;
          var color = geojsonStyle.IconStyle.color;

          if (iconUrl) {
            feature.style.iconUrl = iconUrl;
          }
          if (scale) {
            feature.style.scale = parseFloat(scale);
          }
          if (color) {
            color = abgr2Color(color);
            feature.style.color = color.hex;
            feature.style.opacity = color.opacity;
          }
          if (geojsonStyle.IconStyle.hotSpot) {
            var hotSpotX = parseFloat(geojsonStyle.IconStyle.hotSpot["@x"]);
            var hotSpotY = parseFloat(geojsonStyle.IconStyle.hotSpot["@y"]);
            feature.style.iconAnchor = [hotSpotX, hotSpotY];
          }
          break;
        case "LineStyle":
          var color = abgr2Color(geojsonStyle.LineStyle.color);
          var width = parseFloat(geojsonStyle.LineStyle.width);

          if (color) {
            feature.style.color = color.hex;
            feature.style.opacity = color.opacity;
          }
          if (width) {
            feature.style.weight = width;
          }
          break;
        case "PolyStyle":
          var color = abgr2Color(geojsonStyle.PolyStyle.color);
          var fill = parseInt(fill);
          var stroke = parseInt(geojsonStyle.PolyStyle.outline);

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
          // var coordinatesString = l.coordinates.replace(/\t|\n/gi, '');
          var coordinatesString = l.coordinates.trim();

          coordinatesString.split(/\t|\n|\s/g).forEach(function(pointString) {
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
        // var coordinatesString = placemark.LineString.coordinates.replace(/\t|\n/gi, '');
        var coordinatesString = placemark.LineString.coordinates.trim();

        coordinatesString.split(/\t|\n|\s/g).forEach(function(pointString) {
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
          var coordinates2 = boundarys2Coordinates(polygon);
          coordinates.push(coordinates2);
        });

        geometry.type = "MultiPolygon";
        geometry.coordinates = coordinates;
      } else {
        var coordinates = boundarys2Coordinates(placemark.Polygon);

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

  function boundary2Coordinates(boundary) {
    var boundaryCoordinates = [];
    // var coordinatesString = boundary.LinearRing.coordinates.replace(/\t|\n/gi, '');
    var coordinatesString = boundary.LinearRing.coordinates.trim();

    coordinatesString.split(/\t|\n|\s/g).forEach(function(pointString) {
      if (pointString.trim() !== "") {
        var point = pointString.split(",");
        boundaryCoordinates.push([parseFloat(point[0]), parseFloat(point[1])]);
      }
    });
    return boundaryCoordinates;
  }

  function boundarys2Coordinates(polygon) {
    var coordinates = [];

    ['outerBoundaryIs', 'innerBoundaryIs'].forEach(function(boundaryIs) {
      var boundarys = polygon[boundaryIs];
      if (boundarys) {
        var boundaryCoordinates;
        if (boundarys.forEach) {
          boundarys.forEach(function(boundary) {
            boundaryCoordinates = boundary2Coordinates(boundary);
            coordinates.push(boundaryCoordinates);
          });
        } else {
          boundaryCoordinates = boundary2Coordinates(boundarys);
          coordinates.push(boundaryCoordinates);
        }
      }
    });
    return coordinates;
  }

  function abgr2Color(abgr) {
    var color = {};
    if (typeof abgr === "string" && abgr.length === 8) {
      color.hex = "#" + abgr.slice(6, 8) + abgr.slice(4, 6) + abgr.slice(2, 4);
      color.opacity = Math.round(parseInt(abgr.slice(0, 2), 16) / 255 * 100) / 100;
    } else {
      color.hex = "#000";
      color.opacity = 1;
    }
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
  //kmz2geojsons. Depends on JSZip.
  GeoConvert.kmz2Geojsons = function(kmz, callback) {
    if (JSZip) {
      var count = 0;
      var zip = new JSZip();

      var kmls = [];
      var imgs = {};

      zip.loadAsync(kmz)
        .then(function(result) {
          // for (var f in zip.files) {
          Object.keys(zip.files).forEach(function(f){
            count++;

            var ext = zip.file(f).name.split(".").pop();
            if (ext === "kml") {
              // you now have every files contained in the loaded zip
              result.file(f).async("string").then(function success(content) {
                kmls.push(content);
                finishUnzip();
              }, function error(e) {
                // handle the error
                count--;
              });
            } else if (ext === "png" || ext === "jpg") {
              result.file(f).async("base64").then(function success(content) {
                var base64 = "data:image/" + ext + ";base64,";
                imgs[f] = base64 + content;

                finishUnzip();
              }, function error(e) {
                // handle the error
                count--;
              });
            } else {
              count--;
            }
          });
          // }
        });
    }

    function finishUnzip() {
      count--;
      if (count === 0) {
        var geojsons = [];
        kmls.forEach(function(kml){
          var geojson = GeoConvert.kml2Geojson(kml);
          geojson.features.forEach(function(feature){
            if (feature.style && feature.style.iconUrl && imgs[feature.style.iconUrl]) {
              feature.style.iconUrl = imgs[feature.style.iconUrl];
            }
          });

          geojsons.push(geojson);
        });

        callback && callback(geojsons);
      }
    }
  };
})(window, document);
;
(function(window, document, undefined) {
  //gpx2geojson
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
;
(function(window, document, undefined) {
	//dbase field type
	var dBaseFieldType = {
		"N": "Number",
		"C": "Character", // binary
		"L": "Logical",
		"D": "Date",
		"M": "Memo", // binary
		"F": "Floating point",
		"B": "Binary",
		"G": "General",
		"P": "Picture",
		"Y": "Currency",
		"T": "DateTime",
		"I": "Integer",
		"V": "VariField",
		"X": "Variant",
		"@": "Timestamp",
		"O": "Double",
		"+": "Autoincrement"
	};

	//shapefile2Geojson. shapefile need contain .shp, .dbf.
	//shp & dbf are arrayBuffer.
	GeoConvert.shapefile2Geojson = function(file, toString) {
		var geojson = shapefileHandle(file);

		if (toString) {
			var jsonString = JSON.stringify(geojson);
			return jsonString;
		} else {
			return geojson;
		}
	};

	function shapefileHandle(file) {
		if (file.shp && file.dbf) {
			var geojson = GeoConvert.emptyGeojson();

			//prj
			var projection = file.prj;

			//encoding
			var encoding = file.encoding;

			//shp
			readShpBuffer(file.shp, geojson, projection);
			//dbf
			readDbfBuffer(file.dbf, geojson, encoding);

			return geojson;
		} else {
			throw new Error("need complete shapefile");
		}
	}

	function Transitions(fromProjection, toProjection) {
		this.fromProjection = fromProjection;
		this.toProjection = toProjection;
	}

	Transitions.prototype.trans = function(coordinates) {
		return proj4(this.fromProjection, this.toProjection, coordinates);
	}

	function readShpBuffer(arrayBuffer, geojson, projection) {
		var dataView = new DataView(arrayBuffer);
		var byteLength = dataView.byteLength;

		//Main File Header
		//File Length
		var fileLength = dataView.getInt32(24);

		//Shape Type
		var shapeType = dataView.getInt32(32, true);

		//Bounding Box
		var xmin = dataView.getFloat64(36, true);
		var ymin = dataView.getFloat64(44, true);
		var xmax = dataView.getFloat64(52, true);
		var ymax = dataView.getFloat64(60, true);

		// var zmin = dataView.getFloat64(68, true);
		// var zmax = dataView.getFloat64(76, true);
		// var mmin = dataView.getFloat64(84, true);
		// var mmax = dataView.getFloat64(92, true);

		var transitions = projection && !/GCS_WGS_1984|WGS84/g.test(projection) ? new Transitions(projection, proj4.WGS84) : transitions;
		geojson.bbox = readBoxRecord(dataView, 36, transitions);

		//Record
		var byteOffset = 100;
		while (byteOffset < byteLength) {
			var result = readShpFileRecord(dataView, byteOffset, transitions);
			geojson.features.push(result.feature);
			byteOffset = result.byteOffset;
		}
	}

	function readShpFileRecord(dataView, byteOffset, transitions) {
		var result = {};
		var feature = {};
		feature.type = "Feature";

		//Record Number
		var recordNumber = dataView.getInt32(byteOffset);

		//Content Length
		var contentLength = dataView.getInt32(byteOffset + 4);

		//Shape Type
		var shapeType = dataView.getInt32(byteOffset + 8, true);

		byteOffset += 12;

		var readRecord;
		switch (shapeType) {
			case 0: //Null Shape
				break;

			case 1: //Point
			case 11: //PointZ
			case 21: //PointM
				readRecord = readPointRecord;
				break;

			case 3: //PolyLine
			case 13: //PolyLineZ
			case 23: //PolyLineM
				readRecord = readPolylineRecord;
				break;

			case 5: //Polygon
			case 15: //PolygonZ
			case 25: //PolygonM
				readRecord = readPolygonRecord;
				break;

			case 8: //MultiPoint
			case 18: //MultiPointZ
				readRecord = readMultiPointRecord;
				break;

			case 28: //MultiPointM
				break;

			case 31: //MultiPatch
				break;
			default:
				break;
		}

		if (readRecord) {
			var geometry = {};
			var record = readRecord(dataView, byteOffset, transitions);
			geometry.type = record.type;
			geometry.coordinates = record.coordinates;

			if (record.box) feature.bbox = record.box;
			feature.geometry = geometry;
		}

		result.feature = feature;

		//The content length for a record is the length of the record contents section measured in
		//16-bit words. Each record, therefore, contributes (4 + content length) 16-bit words
		//toward the total length of the file, as stored at Byte 24 in the file header.
		result.byteOffset = byteOffset + contentLength * 2 - 4;
		return result;
	}

	//box type
	function readBoxRecord(dataView, byteOffset, transitions) {
		var xmin = dataView.getFloat64(byteOffset, true);
		var ymin = dataView.getFloat64(byteOffset + 8, true);
		var xmax = dataView.getFloat64(byteOffset + 16, true);
		var ymax = dataView.getFloat64(byteOffset + 24, true);

		var box;
		if (transitions) {
			box = transitions.trans([xmin, ymin]).concat(transitions.trans([xmax, ymax]));
		} else {
			box = [xmin, ymin, xmax, ymax];
		}

		return box;
	}

	//point type
	function readPointRecord(dataView, byteOffset, transitions) {
		var record = {};

		var x = dataView.getFloat64(byteOffset, true);
		var y = dataView.getFloat64(byteOffset + 8, true);
		byteOffset += 16;
		record.type = "Point";
		record.coordinates = transitions ? transitions.trans([x, y]) : [x, y];

		return record;
	}

	//multipoint type
	function readMultiPointRecord(dataView, byteOffset, transitions) {
		var record = {};

		var box = readBoxRecord(dataView, byteOffset, transitions);
		var numPoints = dataView.getInt32(byteOffset + 32, true);
		var points = [];
		var coordinates = [];

		byteOffset = byteOffset + 36;
		for (var i = 0; i < numPoints; i++) {
			var x = dataView.getFloat64(byteOffset, true);
			var y = dataView.getFloat64(byteOffset + 8, true);

			var point = transitions ? transitions.trans([x, y]) : [x, y];
			points.push(point);
			byteOffset += 16;
		}

		record.type = "MultiPoint";
		record.box = box;
		record.coordinates = points;

		return record;
	}

	//pointM type
	function readPointMRecord(dataView, byteOffset, transitions) {
		var record = {};

		var x = dataView.getFloat64(byteOffset, true);
		var y = dataView.getFloat64(byteOffset + 8, true);
		// var m = dataView.getFloat64(byteOffset + 16, true);
		byteOffset += 24;
		record.type = "Point";
		record.coordinates = transitions ? transitions.trans([x, y]) : [x, y];

		return record;
	}

	//pointZ type
	function readPointZRecord(dataView, byteOffset, transitions) {
		var record = {};

		var x = dataView.getFloat64(byteOffset, true);
		var y = dataView.getFloat64(byteOffset + 8, true);
		// var z = dataView.getFloat64(byteOffset + 16, true);
		// var m = dataView.getFloat64(byteOffset + 24, true);
		byteOffset += 32;
		record.type = "Point";
		record.coordinates = transitions ? transitions.trans([x, y]) : [x, y];

		return record;
	}

	//polyline type
	function readPolylineRecord(dataView, byteOffset, transitions) {
		var record = {};

		var box = readBoxRecord(dataView, byteOffset, transitions);
		var numParts = dataView.getInt32(byteOffset + 32, true);
		var numPoints = dataView.getInt32(byteOffset + 36, true);
		var parts = [];
		var points = [];
		var coordinates = [];

		for (var i = 0; i < numParts; i++) {
			var part = dataView.getInt32(byteOffset + 40 + 4 * i, true) - 1;
			parts.push(part);
		}
		parts.push(numPoints - 1);

		byteOffset = byteOffset + 40 + 4 * numParts;
		for (var i = 0; i < numPoints; i++) {
			var x = dataView.getFloat64(byteOffset, true);
			var y = dataView.getFloat64(byteOffset + 8, true);

			var point = transitions ? transitions.trans([x, y]) : [x, y];
			points.push(point);
			byteOffset += 16;

			if (parts.indexOf(i) !== -1) {
				coordinates.push(points);
				points = [];
			}
		}

		record.box = box;
		record.numPoints = numPoints;

		if (numParts === 1) {
			record.type = "LineString";
			record.coordinates = coordinates[0];
		} else {
			record.type = "MultiLineString";
			record.coordinates = coordinates;
		}

		return record;
	}

	//polygon type
	function readPolygonRecord(dataView, byteOffset, transitions) {
		var record = {};

		var box = readBoxRecord(dataView, byteOffset, transitions);
		var numParts = dataView.getInt32(byteOffset + 32, true);
		var numPoints = dataView.getInt32(byteOffset + 36, true);
		var parts = [];
		var points = [];
		var coordinates = [];
		var rings = [];

		var prevX = null;
		var prevY = null;
		var checkCounterClockwise = 0;

		for (var i = 0; i < numParts; i++) {
			var part = dataView.getInt32(byteOffset + 40 + 4 * i, true) - 1;
			parts.push(part);
		}
		parts.push(numPoints - 1);

		byteOffset = byteOffset + 40 + 4 * numParts;
		for (var i = 0; i < numPoints; i++) {
			var x = dataView.getFloat64(byteOffset, true);
			var y = dataView.getFloat64(byteOffset + 8, true);

			var point = transitions ? transitions.trans([x, y]) : [x, y];
			points.push(point);
			byteOffset += 16;

			//check polygon is hole?
			//http://stackoverflow.com/questions/1165647/how-to-determine-if-a-list-of-polygon-points-are-in-clockwise-order
			if (!prevX || !prevY) {
				[prevX, prevY] = [x, y];
			}
			checkCounterClockwise = checkCounterClockwise + (x - prevX) * (y + prevY);
			[prevX, prevY] = [x, y];

			if (parts.indexOf(i) !== -1) {
				coordinates.push(points);

				if (checkCounterClockwise >= 0) {
					rings.push(coordinates);
				} else {
					rings[rings.length - 1] = rings[rings.length - 1].concat(coordinates);
				}

				points = [];
				coordinates = [];
				checkCounterClockwise = 0;
				[prevX, prevY] = [null, null];
			}
		}

		record.box = box;
		record.numPoints = numPoints;

		if (numParts === 1) {
			record.type = "Polygon";
			record.coordinates = rings[0];
		} else {
			record.type = "MultiPolygon";
			record.coordinates = rings;
		}

		return record;
	}

	function readDbfBuffer(arrayBuffer, geojson, encoding) {
		var dataView = new DataView(arrayBuffer);
		var byteLength = dataView.byteLength;

		//Main File Header
		var type = dataView.getInt8(0);
		var numRecords = dataView.getInt32(4, true);
		var headerLength = dataView.getInt16(8, true);
		var recordLength = dataView.getInt16(10, true);

		var decode;
		var codePage = encoding || dataView.getInt8(29);
		switch (codePage) {
			case 0x4F: //big-5
			case "0x4F":
				decode = GeoConvert.decode.big5;
				break;
			default: //utf-8
				decode = GeoConvert.decode.utf8;
				break;
		}

		if (type !== 0x03) {
			throw new Error("File has unknown/unsupported dBase version:" + type);
		}

		//Fidld Descriptions
		var byteOffset = 32;
		var fields = [];
		while (dataView.getUint8(byteOffset) !== 0x0D) {
			var field = {};
			field.name = decode.decode(arrayBuffer.slice(byteOffset, byteOffset + 10)).replace(/\u0000/g, "");
			field.type = dBaseFieldType[decode.decode(arrayBuffer.slice(byteOffset + 11, byteOffset + 12))];
			field.fieldLength = dataView.getUint8(byteOffset + 16);
			field.decimals = dataView.getUint8(byteOffset + 17);
			fields.push(field);

			byteOffset += 32;
		}

		//Record
		var numFields = fields.length;
		for (var i = 0; i < numRecords; i++) {
			var record = {};
			byteOffset = headerLength + i * recordLength;
			//skip delete code
			byteOffset += 1;
			for (var j = 0; j < numFields; j++) {
				var recordField = fields[j];
				var value = decode.decode(arrayBuffer.slice(byteOffset, byteOffset + recordField.fieldLength)).trim();
				record[recordField.name] = value;
				byteOffset += recordField.fieldLength;
			}
			geojson.features[i].properties = record;
		}
	}
})(window, document);
;
(function(window, document, undefined) {
	//code index
	var codeIndex = {
		"1": "text",
		"2": "name",
		"5": "handle",
		"6": "linetypeName",
		"7": "textStyleName",
		"8": "layerName",
		"10": "lowerLeftCorner",
		"11": "upperRightCorner",
		"12": "centerDcs",
		"13": "snapBasePoint",
		"14": "snapSpacing",
		"15": "gridSpacing",
		"16": "viewDirectionFromTarget",
		"17": "viewTarget",
		"39": "thickness",
		"48": "linetypeScale",
		"50": "textRotation",
		"51": "textOblique",
		"60": "visibility",
		"62": "colorNumber",
		"70": "closed"
	};


	//dxf2Geojson. file is dxf text.
	GeoConvert.dxf2Geojson = function(file, toString) {
		var geojson = dxfHandle(file);

		if (toString) {
			var jsonString = JSON.stringify(geojson);
			return jsonString;
		} else {
			return geojson;
		}
	};

	function Transitions(fromProjection, toProjection) {
		this.fromProjection = fromProjection;
		this.toProjection = toProjection;
	}

	Transitions.prototype.trans = function(coordinates) {
		return proj4(this.fromProjection, this.toProjection, coordinates);
	}

	function dxfHandle(file) {
		if (file.dxf !== undefined) {
			var geojson = GeoConvert.emptyGeojson();

			//prj
			var projection = file.prj;
			var transitions = projection && !/GCS_WGS_1984|WGS84/g.test(projection) ? new Transitions(projection, proj4.WGS84) : transitions;

			//dxf
			var dxf = readDxfText(file.dxf);

			//geojson
			var geojson = dxfObject2Geojson(dxf, transitions);

			return geojson;
		} else {
			throw new Error("need dxf file");
		}
	}

	function readDxfText(dxfText) {
		var dxfArray = dxfText.split(/\r\n|\r|\n/g);
		var dxf = {};

		// HEADER
		var headerStart = dxfArray.indexOf("HEADER");
		var headerEnd = dxfArray.indexOf("ENDSEC", headerStart) + 1;
		var headerArray = dxfArray.slice(headerStart, headerEnd);
		dxf.header = readDxfHeader(headerArray);

		// TABLES
		var tablesStart = dxfArray.indexOf("TABLES");
		var tablesEnd = dxfArray.indexOf("ENDSEC", tablesStart) + 1;
		var tablesArray = dxfArray.slice(tablesStart, tablesEnd);
		dxf.tables = readDxfTables(tablesArray);

		// BLOCKS
		var blocksStart = dxfArray.indexOf("BLOCKS");
		var blocksEnd = dxfArray.indexOf("ENDSEC", blocksStart) + 1;
		var blocksArray = dxfArray.slice(blocksStart, blocksEnd);
		dxf.blocks = readDxfBlocks(blocksArray);

		// ENTITIES
		var entitiesStart = dxfArray.indexOf("ENTITIES");
		var entitiesEnd = dxfArray.indexOf("ENDSEC", entitiesStart) + 1;
		var entitiesArray = dxfArray.slice(entitiesStart, entitiesEnd);
		dxf.entities = readDxfEntities(entitiesArray);

		return dxf;
	}

	//origin point of dxf
	function readDxfPoints(data, start, x, y, z) {
		var points = {};
		points.x = readGroupValue(x, data[start]);
		points.y = readGroupValue(y, data[start + 2]);

		if (z !== undefined) {
			points.z = readGroupValue(z, data[start + 4]);
		}
		return points;
	}

	// //point of geojson
	// function readDxfPoints(data, start, x, y, z) {
	// 	var x = readGroupValue(x, data[start]);
	// 	var y = readGroupValue(y, data[start + 2]);
	// 	var points = [x, y];

	// 	return points;
	// }

	function readDxfHeader(headerArray) {
		var imax = headerArray.length;
		var i = 0;
		var header = {};

		while (i < imax) {
			var code = headerArray[i].trim();
			if (code === "9") {
				var key = headerArray[i + 1];
				var valueCode = headerArray[i + 2].trim();
				if (valueCode === "10") {
					var points = {};
					var start = i + 3;
					if (headerArray[i + 6].trim() === "30") {
						points = readDxfPoints(headerArray, start, 10, 20, 30);;
						i = i + 8;
					} else {
						points = readDxfPoints(headerArray, start, 10, 20);
						i = i + 6;
					}
					header[key] = points;
				} else {
					header[key] = readGroupValue(parseInt(valueCode), headerArray[i + 3]);
					i = i + 4;
				}
			} else {
				i++;
			}
		}

		return header;
	}

	function readDxfTable(tableArray, index) {
		var length = tableArray.length - 2;
		var table = {};
		var code, value, name;

		while (index < length) {
			code = tableArray[index].trim();
			value = tableArray[index + 1].trim();

			switch (code) {
				case "0":
					var start = index + 2;
					var end = tableArray.indexOf(name, start) + 1 || length;
					var children = tableArray.slice(start, end - 2);
					table[value] = table[value] || [];
					table[value].push(readDxfTable(children, 0));
					index = end - 4;
					break;
				case "2":
					name = value;
					table.name = value;
					break;
				case "3":
					table.description = value;
					break;
				case "5":
					table.handle = value;
					break;
				case "10":
				case "11":
				case "12":
				case "13":
				case "14":
				case "15":
					var start = index + 1;
					var x = parseInt(code);
					table[codeIndex[code]] = readDxfPoints(tableArray, start, x, x + 10);
					break;
				case "16":
				case "17":
					var start = index + 1;
					var x = parseInt(code);
					table[codeIndex[code]] = readDxfPoints(tableArray, start, x, x + 10, x + 20);
					break;
				case "40":
					table.patternLength = parseFloat(value);
					break;
				case "49":
					table.elements.push(parseFloat(value));
					break;
				case "62":
					table.color = parseInt(value);
					break;
				case "73":
					table.elements = [];
					break;
				case "330":
				case "360":
					table.ownerHandle = value;
					break;
			}
			index = index + 2;
		}
		return table;
	}

	function readDxfTables(tablesArray) {
		var imax = tablesArray.length;
		var i = 0;
		var tables = {};

		while (i < imax) {
			var tableStart = tablesArray.indexOf("TABLE", i);
			var tableEnd = tablesArray.indexOf("ENDTAB", tableStart) + 1;

			if (tableEnd !== 0) {
				var tableArray = tablesArray.slice(tableStart, tableEnd);
				tables[tablesArray[tableStart + 2]] = readDxfTable(tableArray, 1);
				i = tableEnd;
			} else {
				i = imax + 1;
			}
		}

		return tables;
	}

	function readDxfBlock(blockArray, index) {
		var length = blockArray.length - 2;
		var block = {};
		var code, value;

		while (index < length) {
			code = blockArray[index].trim();
			value = blockArray[index + 1].trim();

			switch (code) {
				case "0":
					var end = blockArray.indexOf("  0", index + 2) + 1 || length;
					var children = blockArray.slice(index, end - 1);

					block.entities = block.entities || [];
					block.entities.push(readDxfEntity(children, 0));
					index = end - 3;
					break;
				case "1":
					block.xrefName = value;
					break;
				case "2":
					block.name = value;
					break;
				case "3":
					block.blockName = value;
					break;
				case "5":
					block.handle = value;
					break;
				case "8":
					block.layerName = value;
					break;
				case "10":
					var start = index + 1;
					block.basePoint = readDxfPoints(blockArray, start, 10, 20, 30);
					break;
				case "330":
					block.ownerHandle = value;
					break;
				case "360":
					table.ownerHandle = value;
					break;
			}

			index = index + 2;
		}
		return block;
	}

	function readDxfBlocks(blocksArray) {
		var imax = blocksArray.length;
		var i = 0;
		var blocks = {};

		while (i < imax) {
			var blockStart = blocksArray.indexOf("BLOCK", i);
			var blockEnd = blocksArray.indexOf("ENDBLK", blockStart) + 1;

			if (blockEnd !== 0) {
				var blockArray = blocksArray.slice(blockStart, blockEnd);

				var block = readDxfBlock(blockArray, 1);
				blocks[block.blockName] = block;
				i = blockEnd;
			} else {
				i = imax + 1;
			}
		}

		return blocks;
	}

	function readDxfEntity(entityArray, index) {
		var length = entityArray.length;
		var entity = {};
		var code, value, type;
		var edgeType = false;

		while (index < length) {
			code = entityArray[index].trim();
			value = entityArray[index + 1].trim();

			switch (code) {
				case "0":
					type = value;
					entity.entityType = value;
					break;
				case "1":
				case "5":
				case "6":
				case "7":
				case "8":
					entity[codeIndex[code]] = value;
					break;
				case "10":
					var start = index + 1;
					switch (type) {
						case "HATCH":
							if (edgeType) {
								var vertices = entity.multiVertices[entity.multiVertices.length - 1];
								if (entity.verticesNumber > vertices.length) {
									var point = readDxfPoints(entityArray, start, 10, 20);
									var lastPoint = vertices[vertices.length - 1];
									if (lastPoint === undefined || (lastPoint.x !== point.x && lastPoint.y !== point.y)) {
										vertices.push(point);
									}
								}
							}
							break;
						case "LWPOLYLINE":
							entity.vertices = entity.vertices || [];
							entity.vertices.push(readDxfPoints(entityArray, start, 10, 20));
							break;
						case "POINT":
						case "MTEXT":
						case "XLINE":
							entity.point = readDxfPoints(entityArray, start, 10, 20, 30);
							break;
						case "TEXT":
						case "LINE":
							entity.startPoint = readDxfPoints(entityArray, start, 10, 20, 30);
							break;
					}

					break;
				case "11":
					var start = index + 1;
					switch (type) {
						case "HATCH":
							if (edgeType) {
								var vertices = entity.multiVertices[entity.multiVertices.length - 1];
								vertices.push(readDxfPoints(entityArray, start, 11, 21));
							}
							edgeType = false;
							break;
						case "TEXT":
						case "LINE":
							entity.endPoint = readDxfPoints(entityArray, start, 10, 20, 30);
							break;
					}

					break;
				case "39":
				case "48":
				case "50":
				case "51":
					entity[codeIndex[code]] = parseFloat(value);
					break;
				case "40":
					switch (type) {
						case "TEXT":
							entity.textHeight = parseFloat(value);
							break;
						case "ARC":
						case "CIRCLE":
							entity.radius = parseFloat(value);
							break;
					}
					break;
				case "60":
				case "62":
				case "70":
					entity[codeIndex[code]] = parseInt(value);
					break;
				case "72":
					if (value === "1" || value === "0") {
						edgeType = true;
					}
					break;
				case "91":
					entity.multiVertices = [];
					break;
				case "93":
					entity.verticesNumber = parseInt(value);
					entity.multiVertices.push([]);
					break;
				case "330":
					entity.ownerHandle = value;
					break;
			}

			index = index + 2;
		}
		return entity;
	}

	function readDxfEntities(entitiesArray) {
		var imax = entitiesArray.length;
		var i = 0;
		var entities = [];

		while (i < imax) {
			var entityStart = entitiesArray.indexOf("  0", i);
			var entityEnd = entitiesArray.indexOf("  0", entityStart + 1);

			if (entityEnd !== -1) {
				var entityArray = entitiesArray.slice(entityStart, entityEnd);

				var entity = readDxfEntity(entityArray, 0);
				entities.push(entity);
				i = entityEnd;
			} else {
				i = imax + 1;
			}
		}

		return entities;
	}

	function readGroupValue(code, value) {
		if (code <= 9) {
			return value;
		} else if (code >= 10 && code <= 59) {
			return parseFloat(value);
		} else if (code >= 60 && code <= 99) {
			return parseInt(value);
		} else if (code >= 100 && code <= 109) {
			return value;
		} else if (code >= 110 && code <= 149) {
			return parseFloat(value);
		} else if (code >= 160 && code <= 179) {
			return parseInt(value);
		} else if (code >= 210 && code <= 239) {
			return parseFloat(value);
		} else if (code >= 270 && code <= 289) {
			return parseInt(value);
		} else if (code >= 290 && code <= 299) {
			return !!parseInt(value);
		} else if (code >= 300 && code <= 369) {
			return value;
		} else if (code >= 370 && code <= 389) {
			return parseInt(value);
		} else if (code >= 390 && code <= 399) {
			return value;
		} else if (code >= 400 && code <= 409) {
			return parseInt(value);
		} else if (code >= 410 && code <= 419) {
			return value;
		} else if (code >= 420 && code <= 429) {
			return parseInt(value);
		} else if (code >= 430 && code <= 439) {
			return value;
		} else if (code >= 440 && code <= 459) {
			return parseInt(value);
		} else if (code >= 460 && code <= 469) {
			return parseFloat(value);
		} else if (code >= 470 && code <= 481) {
			return value;
		} else if (code === 999) {
			return value;
		} else if (code >= 1000 && code <= 1009) {
			return value;
		} else if (code >= 1010 && code <= 1059) {
			return parseFloat(value);
		} else if (code >= 1060 && code <= 1071) {
			return parseInt(value);
		} else {
			return value;
		}
	}

	function dxf2GeojsonPoint(point, transitions) {
		var point = transitions ? transitions.trans([point.x, point.y]) : [point.x, point.y];
		return point;
	}

	function dxf2GeojsonPolyline(polyline, transitions) {
		var lineString = [];
		if (polyline === undefined)
			var cc = 123;
		polyline.forEach(function(point) {
			lineString.push(dxf2GeojsonPoint(point, transitions));
		});
		return lineString;
	}

	function dxfEntity2Feature(entity, transitions) {
		var geometry = {};
		switch (entity.entityType) {
			case "ARC":
				break;
			case "CIRCLE":
				break;
			case "INSERT":
				break;
			case "TEXT":
				geometry.type = "Point";
				geometry.coordinates = dxf2GeojsonPoint(entity.startPoint, transitions);
				break;
			case "LINE":
				geometry.type = "LineString";
				geometry.coordinates = dxf2GeojsonPolyline([entity.startPoint, entity.endPoint], transitions);
				break;
			case "LWPOLYLINE":
				geometry.type = "LineString";
				geometry.coordinates = dxf2GeojsonPolyline(entity.vertices, transitions);
				if (entity.closed === 1) {
					geometry.coordinates.push(geometry.coordinates[0]);
				}
				break;
			case "HATCH":
				geometry.type = "Polygon";
				geometry.coordinates = [];
				entity.multiVertices.forEach(function(vertices) {
					var coordinates = dxf2GeojsonPolyline(vertices, transitions);
					coordinates.push(coordinates[0]);
					geometry.coordinates.push(coordinates);
				});
				break;
			default:
				break;
		}

		if (geometry.type !== undefined) {
			var feature = {};
			feature.type = "Feature";
			feature.geometry = geometry;
			feature.properties = {};
			feature.style = {};

			[
				"text",
				"textHeight",
				"textStyleName",
				"layerName",
				"entityType"
			].forEach(function(name) {
				if (entity[name] !== undefined) {
					feature.properties[name] = entity[name];
				}
			});

			return feature;
		}
	}

	function dxfObject2Geojson(dxf, transitions) {
		var geojson = GeoConvert.emptyGeojson();

		//blocks
		for (var key in dxf.blocks) {
			var block = dxf.blocks[key];
			var entities = block.entities;

			if (entities !== undefined) {
				entities.forEach(function(entity) {
					var feature = dxfEntity2Feature(entity, transitions);
					if (feature !== undefined) {
						geojson.features.push(feature);
					}
				});
			}
		}

		//entities
		dxf.entities.forEach(function(entity) {
			var feature = dxfEntity2Feature(entity, transitions);
			if (feature !== undefined) {
				geojson.features.push(feature);
			}
		});

		return geojson;
	}
})(window, document);
;
(function(window, document, undefined) {
    //wkt2geojson
    GeoConvert.wkt2Geojson = function(wkt, toString) {
        var geojson = wktHandle(wkt);

        if (toString) {
            var jsonString = JSON.stringify(geojson);
            return jsonString;
        } else {
            return geojson;
        }
    };

    function wktHandle(wkt) {
        if (typeof wkt === "string") {
            var geojson = GeoConvert.emptyGeojson();

            wkt = wkt.trim();
            var geometryType = wkt.split('(').shift().trim();

            var readRecord;
            switch (geometryType) {
                case 'POINT':
                    readRecord = readPointRecord;
                    break;

                case 'LINESTRING':
                    readRecord = readLineStringRecord;
                    break;

                case 'POLYGON':
                    readRecord = readPolygonRecord;
                    break;

                default:
                    break;
            }

            if (readRecord) {
                var feature = {};
                var geometry = readRecord(wkt);

                feature.type = "Feature";
                feature.properties = {};
                feature.geometry = geometry;

                geojson.features.push(feature);
            }

            return geojson;
        } else {
            throw new Error("need wkt");
        }
    }

    function xy2Array(xy) {
        var xySplit = xy.trim().split(' ');
        return [parseFloat(xySplit[0]), parseFloat(xySplit[1])];
    }

    //point type
    function readPointRecord(wkt) {
        var geometry = {};
        var parentheses1 = wkt.indexOf('(');
        var parentheses2 = wkt.lastIndexOf(')');

        var wGeometry = wkt.slice(parentheses1 + 1, parentheses2);

        geometry.type = "Point";
        geometry.coordinates = xy2Array(wGeometry)

        return geometry;
    }

    //lineString type
    function readLineStringRecord(wkt) {
        var geometry = {};
        var parentheses1 = wkt.indexOf('(');
        var parentheses2 = wkt.lastIndexOf(')');

        var wGeometry = wkt.slice(parentheses1 + 1, parentheses2);

        geometry.type = "LineString";
        geometry.coordinates = wGeometry.split(',').map(xy2Array);

        return geometry;
    }

    //polygon type
    function readPolygonRecord(wkt) {
        var geometry = {};
        var parentheses1 = wkt.indexOf('(');
        var parentheses2 = wkt.lastIndexOf(')');

        var wGeometry = wkt.slice(parentheses1 + 1, parentheses2);

        geometry.type = "Polygon";
        geometry.coordinates = wGeometry.split('),').map(function(rings) {
            rings = rings.indexOf(')') !== -1 ? rings : rings + ')';
            return readLineStringRecord(rings).coordinates;
        });

        return geometry;
    }
})(window, document);
