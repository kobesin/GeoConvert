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