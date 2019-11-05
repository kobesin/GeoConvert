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

				entity = readDxfEntity(entityArray, 0);
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
