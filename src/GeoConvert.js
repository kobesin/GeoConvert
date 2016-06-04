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