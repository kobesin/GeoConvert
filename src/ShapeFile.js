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