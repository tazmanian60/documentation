function BomCtrl($scope, $http, $q, $log) {
	$scope.guides = [{}];
	$scope.wikiMarkup = '';

	// TODO make it add a blank url box if all are full.
	// TODO make it remove blank url boxes if they're not the last in the list
 
	$scope.generate = function() {
		// TODO make it use guide urls from text boxes instead of hardcoded list.
		parts = {};
		DOZUKI_GUIDE_IDS = [
			85, // bottom frame
			86, // top frame
			87, // shear table
			84, // assemble the pieces
		];
		$log.debug(sprintf("Processing %s guides...", DOZUKI_GUIDE_IDS.length));
		BASE_URL = 'https://opensourceecology.dozuki.com/api/2.0/guides';
		var promises = DOZUKI_GUIDE_IDS.map(function(guideId) {
			url = sprintf("%s/%s", BASE_URL, guideId);
			return processUrl(parts, url);
		});
		$q.all(promises).then(function() {
			outputBom(parts);
		});
	};

	var processUrl = function(parts, url) {
		$log.debug("Processing url " + url);
		var promise = $http.get(url);
		promise.success(function(data, status, headers, config) {
			$log.debug("Got successful response:");
			$log.debug(data);
			extractParts(parts, data);
					$log.debug(parts);
		});
		promise.error(function(data, status, headers, config) {
			alert(sprintf("There was an error loading guide %s. Make sure it's public.\n(Status: %s)", url, status));
		});
		return promise;
	};

	var extractParts = function(parts, guide) {
		var partsLevel = {val: null}; // needs to be an obj so closures can modify it
		angular.forEach(guide.steps, function(step) {
			angular.forEach(step.lines, function(line) {
				if (partsLevel.val !== null) {
					if (line.level === partsLevel.val) {
						processPartLine(parts, guide, step, line.text_raw);
					} else {
						partsLevel.val = null;
					}
				} else if (line.text_raw.indexOf('Parts') === 0) {
					partsLevel.val = line.level + 1;
				}
			});
		});
		// $log.debug(parts);
	};

	/**
	 * Part lines must start with a number, then have a space, then have the part
	 * name. If you want to include more info, put it in parenthases after the
	 * part name.
	 **/
	var processPartLine = function(parts, guide, step, lineText) {
		var regexp = /^([0-9.]+) ([^(]+)/m;
		var match = regexp.exec(lineText);
		if (match === null) {
			alert(sprintf("Can't understand part line from '%s', step %s: '%s'", guide.title, step.orderby, lineText));
			return;
		}
		var count = parseFloat(match[1].trim());
		var name = match[2].trim();
		// $log.debug(sprintf("%s %s", count, name));
		addPart(parts, sprintf("%s, step %s", guide.title, step.orderby), name, count);
		// $log.debug(parts);
	};

	var addPart = function(parts, usedBy, name, count) {
		if (name.slice(-1) !== 's') {
			name = name + 's';
		}

		if (!(name in parts)) {
			parts[name] = {count: 0, usedBy: {}}; // usedBy is a set
		}
		parts[name].count += count;
		parts[name].usedBy[usedBy] = true;
	};

	var outputBom = function(parts) {
		// $scope.wikiMarkup = angular.toJson(parts, true);
	
		$scope.wikiMarkup = '';
		var out = function(txt) {
			$scope.wikiMarkup += txt + "\n";
		};
		out("<!--START OF GENERATED BOM. Copy from here until the end into the wiki.-->\n");
		out("<pre>");
		out("This BOM was generated from the dozuki guides on " + (new Date()).toUTCString() + "\n");
		out("WARNING: If you hand-edit this list, your changes will be lost when");
		out("the BOM is regenerated. If anything is wrong, you should update the");
		out("parts entries in dozuki, fix the BOM generator, or make a note in a");
		out("section other than the generated list.");
		out('');
		// out(make_parts_table(parts));
		out('');
		var sortedParts = Object.keys(parts).sort(function(a, b) {
			// TODO fix sorting
			var a2 = a.split(' ')[a.length - 1] + a;
			var b2 = b.split(' ')[b.length - 1] + b;
			if (a2 < b2) {
				return -1;
			} else if (a2 > b2) {
				return 1;
			} else {
				return 0;
			}
		});
		sortedParts.forEach(function(part) {
			var count = parts[part]['count'];
			if (parseFloat(Math.round(count)) === parseFloat(count)) {
				count = parseInt(count, 10);
			}
			var part_name = plural(count, part);
			out("Count: " + count + ", Part: " + part_name);
			Object.keys(parts[part].usedBy).forEach(function(usedBy) {
				out("    Used by: " + usedBy);
			});
		});
		out("</pre>\n");
		out("<!--END OF GENERATED BOM.-->");
	};

// def make_parts_table(parts):
// 	rval = ''
// 	rval += "Count\t Part\n"
// 	rval += "-----\t ----\n"
// 	for part in sorted(parts.keys(), key=lambda x: x.split()[-1] + x):
// 		count = parts[part]['count']
// 		if float(round(count)) == count:
// 			count = int(count)
// 		part_name = plural(count, part)
// 		rval += "" + '%5s' % format(str(count)) + "\t " + part_name + "\n"
// 	return rval

	var plural = function(num, text) {
		if (text.slice(-1) === 's') {
			text = text.slice(0, -1);
		}
		var suffix = 's';
		if (num === 1 || text.slice(-6) === 'grease') {
			suffix = '';
		}
		return sprintf("%s%s", text, suffix);
	};
}
