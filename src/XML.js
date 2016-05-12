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