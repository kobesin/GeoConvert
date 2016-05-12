var GeoConvert = {};

GeoConvert.emptyGeojson = function() {
	var geojson = {};
	geojson.type = "FeatureCollection";
	geojson.features = [];

	return geojson;
};