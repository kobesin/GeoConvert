# GeoConvert

Converting between Geojson and GIS file formats

KML(KMZ), GPX, Shapefile, DXF(unfinished), WKT(unfinished)

Rreference the JavaScript file manually:
```html
<script src="dist/GeoConvert.min.js"></script>
```
Note that coordinate transformations depend on proj4.js (this means proj4.js must be included before including the file).
```html
<script src="lib/proj4.js"></script>
```

Usage
-----
kml to geojson
```javascript
GeoConvert.kml2Geojson(kml);
```

geojson to kml
```javascript
GeoConvert.geojson2Kml(geojson);
```

gpx to geojson
```javascript
GeoConvert.gpx2Geojson(kml);
```

geojson to gpx
```javascript
GeoConvert.geojson2Gpx(geojson);
```

shapefile to geojson
```javascript
//shapefile is a object that contain shp, dbf [arrayBuffer], prj? [string]
var shapefile = {};
shapefile.shp = arrayBuffer_shp;
shapefile.dbf = arrayBuffer_dbf;

//optional
shapefile.prj = string_prj;

GeoConvert.shapefile2Geojson(shapefile);
```

wkt to geojson
```javascript
GeoConvert.wkt2Geojson(wkt);
```
