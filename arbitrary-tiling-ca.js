

var optionsElem = document.getElementById("optionsElem"),
	tilesInp = document.getElementById("tilesInp"),
	repeatXInp = document.getElementById("repeatXInp"),
	repeatYInp = document.getElementById("repeatYInp"),
	applyGridDimensionsButton = document.getElementById("applyGridDimensionsButton"),
	wrapInp = document.getElementById("wrapInp"),
	orderElem = document.getElementById("orderElem"),
	ruleInp = document.getElementById("ruleInp"),
	randomRuleButton = document.getElementById("randomRuleButton"),
	statesList = document.getElementById("statesList"),
	runButton = document.getElementById("runButton"),
	stepButton = document.getElementById("stepButton"),
	speedLabel = document.getElementById("speedLabel"),
	slowerButton = document.getElementById("slowerButton"),
	fasterButton = document.getElementById("fasterButton"),
	randomPatternButton = document.getElementById("randomPatternButton"),
	canvas = document.getElementById("canvas"),
	ctx = canvas.getContext("2d");

var bgColor = "black",
	cellBorderColor = "black",
	deadColor = "#e3e3e3",
	stateButtonsBaseColor = [226, 255, 255],
	colorScaleMin = 0.5,
	minBorderZoom = 2.5,
	scrollRange = 8, // range in both directions as a multiple of the camera's dimension
	minScrollInterval = 10,
	scrollButtonTimeInterval = 50,
	scrollButtonRepeatDelay = 200,
	scrollBarSize = 16,
	scrollHandleSize = 14,
	scrollButtonSymbolSize = 8,
	scrollButtonSymbolLength = 5,
	scrollBarColor = "#eee",
	scrollHandleColor = "lightgray",
	scrollHandleHoverColor = "darkgray",
	scrollButtonHoverColor = "lightgray",
	scrollButtonSymbolColor = "dimgray",
	keyControlsIgnoredElements = new Set(["input", "select"]),
	defaultShapeRules = {
		0: "//1",
		1: "1/1/2",
		2: "1/1/2",
		other: "23/3/2"
	};

var width, height,
	wrapGrid = wrapInp.checked,
	zoom = 10,
	cameraWidth, cameraHeight,
	cameraX = 0,
	cameraY = 0,
	verticalScrollPosition = 0.5,
	horizontalScrollPosition = 0.5,
	verticalScrollInterval,
	horizontalScrollInterval,
	verticalScrollHandleLength,
	horizontalScrollHandleLength,
	verticalScrollBarHeight,
	horizontalScrollBarWidth,
	scrollOriginalCameraX,
	scrollOriginalCameraY,
	scrollOriginalMouseX,
	scrollOriginalMouseY,
	scrollWidgetBoxes = {},
	touchingScrollWidgets = {},
	selectedState = 1,
	currentDrawingState,
	shapeRules = {},
	rule, ruleMaxNumStates,
	tiling,
	cellStates, specifiedCells,
	unspecifiedStates,
	gridWidth, gridHeight,
	mouseCaptureType = false,
	stepInterval = 50,
	running = false,
	runningPaused = false,
	runInterval,
	runTimeout,
	lastStepTime;


speedLabel.textContent = stepInterval/1000;


sizeCanvas();

tilings.forEach((tiling, i) => {
	getTilingLineSegments(tiling);
	getTilingNeighborCounts(tiling);
	getTilingNeighborsOf(tiling);
	getTilingBoundingBox(tiling);
	var option = document.createElement("option");
	option.value = i;
	option.textContent = tiling.name;
	tilesInp.appendChild(option);
});


loadTiling();

tilesInp.addEventListener("change", () => {
	loadTiling();
});

ruleInp.addEventListener("change", () => {
	loadShapeRules();
});

wrapInp.addEventListener("change", () => {
	wrapGrid = wrapInp.checked;
});

repeatXInp.addEventListener("change", () => {
	applyGridDimensionsButton.disabled = repeatXInp.value == gridWidth && repeatYInp.value == gridHeight;
});

repeatYInp.addEventListener("change", () => {
	applyGridDimensionsButton.disabled = repeatXInp.value == gridWidth && repeatYInp.value == gridHeight;
});

applyGridDimensionsButton.addEventListener("click", () => {
	updateGridDimensions(parseInt(repeatXInp.value), parseInt(repeatYInp.value));
	applyGridDimensionsButton.disabled = true;
});


runButton.addEventListener("click", () => {
	controlRun();
});

stepButton.addEventListener("click", () => {
	controlStep();
});

randomPatternButton.addEventListener("click", () => {
	unspecifiedStates = tiling.cells.map(() => 0);
	cellStates = {};
	specifiedCells = new Set();
	
	for (let x = 0; x < gridWidth; x++) {
		for (let y = 0; y < gridHeight; y++) {
			tiling.cells.forEach((cell, i) => {
				var state = Math.floor(Math.random() * rule[cell.type].numStates);
				if (state) {
					let id = coordsToId([x, y, i]);
					cellStates[id] = state;
					specifiedCells.add(id);
				}
			});
		}
	}
});

slowerButton.addEventListener("click", () => controlSlower());

fasterButton.addEventListener("click", () => controlFaster());

randomRuleButton.addEventListener("click", () => {
	ruleInp.value = tiling.shapeOrder.map(type => {
		return amountsSet(0, tiling.maxNeighbors[type]) + "/" + amountsSet(1, tiling.maxNeighbors[type]) + "/" + Math.floor(Math.random() * 5 + 2);
	}).join(", ");
	
	loadShapeRules();
	
	function amountsSet(min, max) {
		var result = "";
		for (let n = min; n <= max; n++) {
			if (Math.floor(Math.random() * 2)) result += n;
		}
		return result;
	}
});


canvas.addEventListener("wheel", e => {
	if (e.deltaY) {
		e.preventDefault();
		
		let [mouseX, mouseY] = eventCanvasCoords(e),
			[targetX, targetY] = gridCoords(mouseX, mouseY);
		
		if (e.deltaY > 0) zoom /= 2;
		else zoom *= 2;
		
		let newPos = getSharedCameraPosition(targetX, targetY, mouseX, mouseY);
		cameraX = newPos[0];
		cameraY = newPos[1];
	}
});

document.addEventListener("mousedown", e => {
	var [canvasX, canvasY] = eventCanvasCoords(e);
	if (canvasX >= 0 && canvasY >= 0) {
		if (canvasX < cameraWidth && canvasY < cameraHeight) {
			captureMouse("draw");
			if (running) {
				runningPaused = true;
				stopRunning(false);
			}
			let c = getTargetedCell(canvasX, canvasY);
			currentDrawingState = !(c && getCell(c) === selectedState) ? selectedState : 0;
			if (c) {
				setCell(c, currentDrawingState);
			}
		} else if (touchingScrollWidgets.vertical) {
			scrollOriginalCameraY = cameraY;
			scrollOriginalMouseY = canvasY;
			captureMouse("vscroll");
		} else if (touchingScrollWidgets.horizontal) {
			scrollOriginalCameraX = cameraX;
			scrollOriginalMouseX = canvasX;
			captureMouse("hscroll");
		} else if (touchingScrollWidgets.up) {
			captureMouse("scrollup");
			cameraY -= verticalScrollInterval/zoom;
			buttonScrollTimeout = setTimeout(() => {
				buttonScrollInterval = setInterval(() => {
					if (touchingScrollWidgets.up) cameraY -= verticalScrollInterval/zoom;
				}, scrollButtonTimeInterval);
			}, scrollButtonRepeatDelay);
		} else if (touchingScrollWidgets.down) {
			captureMouse("scrolldown");
			cameraY += verticalScrollInterval/zoom;
			buttonScrollTimeout = setTimeout(() => {
				buttonScrollInterval = setInterval(() => {
					if (touchingScrollWidgets.down) cameraY += verticalScrollInterval/zoom;
				}, scrollButtonTimeInterval);
			}, scrollButtonRepeatDelay);
		} else if (touchingScrollWidgets.left) {
			captureMouse("scrollleft");
			cameraX -= horizontalScrollInterval/zoom;
			buttonScrollTimeout = setTimeout(() => {
				buttonScrollInterval = setInterval(() => {
					if (touchingScrollWidgets.left) cameraX -= horizontalScrollInterval/zoom;
				}, scrollButtonTimeInterval);
			}, scrollButtonRepeatDelay);
		} else if (touchingScrollWidgets.right) {
			captureMouse("scrollright");
			cameraX += horizontalScrollInterval/zoom;
			buttonScrollTimeout = setTimeout(() => {
				buttonScrollInterval = setInterval(() => {
					if (touchingScrollWidgets.right) cameraX += horizontalScrollInterval/zoom;
				}, scrollButtonTimeInterval);
			}, scrollButtonRepeatDelay);
		}
	}
});

document.addEventListener("mousemove", e => {
	var [canvasX, canvasY] = eventCanvasCoords(e);
	if (mouseCaptureType === "draw" && 0 <= canvasX && canvasX < cameraWidth && 0 <= canvasY && canvasY <= cameraHeight) {
		if (e.buttons) {
			let c = getTargetedCell(canvasX, canvasY);
			if (c) {
				setCell(c, currentDrawingState);
			}
		}
	} else if (mouseCaptureType === "vscroll") {
		let maxScrollAmount = (verticalScrollBarHeight - verticalScrollHandleLength)/2,
			scrollAmount = canvasY - scrollOriginalMouseY;
		
		if (Math.abs(scrollAmount) > maxScrollAmount) {
			scrollAmount = maxScrollAmount * Math.sign(scrollAmount);
		}
		
		cameraY = scrollOriginalCameraY + ((scrollAmount * verticalScrollInterval)/zoom);
		verticalScrollPosition = ((scrollAmount + maxScrollAmount)/(2 * maxScrollAmount));
	} else if (mouseCaptureType === "hscroll") {
		let maxScrollAmount = (horizontalScrollBarWidth - horizontalScrollHandleLength)/2,
			scrollAmount = canvasX - scrollOriginalMouseX;
		
		if (Math.abs(scrollAmount) > maxScrollAmount) {
			scrollAmount = maxScrollAmount * Math.sign(scrollAmount);
		}
		
		cameraX = scrollOriginalCameraX + ((scrollAmount * horizontalScrollInterval)/zoom);
		horizontalScrollPosition = ((scrollAmount + maxScrollAmount)/(2 * maxScrollAmount));
	}
	touchingScrollWidgets = getTouchingScrollWidgets(canvasX, canvasY);
});

document.addEventListener("mouseup", () => {
	if (mouseCaptureType === "draw") {
		if (runningPaused) {
			runningPaused = false;
			startRunning(false);
		}
	} else if (mouseCaptureType === "vscroll") verticalScrollPosition = 0.5;
	else if (mouseCaptureType === "hscroll") horizontalScrollPosition = 0.5;
	else if (/^scroll(up|down|left|right)$/.test(mouseCaptureType)) {
		clearTimeout(buttonScrollTimeout);
		clearInterval(buttonScrollInterval);
	}
	releaseMouse();
});

document.addEventListener("keypress", e => {
	if (!keyControlsIgnoredElements.has(e.target.tagName.toLowerCase())) {
		let isControl = true;
		if (e.key === "Enter") controlRun();
		else if (e.key === " ") controlStep();
		else if (e.key === "-") controlSlower();
		else if (e.key === "=" || e.key === "+") controlFaster();
		else isControl = false;
		if (isControl) e.preventDefault();
	}
});


function controlRun() {
	if (running) {
		stopRunning();
	} else {
		startRunning();
	}
}

function controlStep() {
	stopRunning();
	step();
}

function controlSlower() {
	stepInterval *= 2;
	if (running) {
		stopRunning(false);
		let timeSinceLastStep = Date.now() - lastStepTime;
		runTimeout = setTimeout(() => startRunning(false), stepInterval - timeSinceLastStep);
	}
	speedLabel.textContent = stepInterval/1000;
}

function controlFaster() {
	stepInterval /= 2;
	if (running) {
		stopRunning(false);
		let timeSinceLastStep = Date.now() - lastStepTime;
		if (timeSinceLastStep >= stepInterval) startRunning(false);
		else runTimeout = setTimeout(() => startRunning(false), stepInterval - timeSinceLastStep);
	}
	speedLabel.textContent = stepInterval/1000;
}


window.addEventListener("resize", () => sizeCanvas());


renderLoop();

function renderLoop() {
	renderPlayingField();
	renderScrollBars();
	requestAnimationFrame(renderLoop);
}


function startRunning(ui = true) {
	if (ui) runButton.textContent = "Stop";
	running = true;
	step();
	runInterval = setInterval(step, stepInterval);
}

function stopRunning(ui = true) {
	if (ui) runButton.textContent = "Start";
	clearInterval(runInterval);
	clearTimeout(runTimeout);
	running = false;
}

function step() {
	lastStepTime = Date.now();
	
	var newUnspecifiedStates = unspecifiedStates.map((state, i) => {
			return getNewCellState(tiling.cells[i].type, state, tiling.cells[i].neighbors.map(([, , ni]) => unspecifiedStates[ni]));
		}),
		newCellStates = {},
		newSpecifiedCells = new Set(),
		cellsToLookAt = new Set();
	
	for (let id of specifiedCells) {
		let [x, y, i] = idToCoords(id);
		cellsToLookAt.add(id);
		tiling.cells[i].neighborOf.forEach(([nx, ny, ni]) => {
			cellsToLookAt.add(coordsToId([...normalizeCoords(x + nx, y + ny), ni]));
		});
	}
	
	for (let id of cellsToLookAt) {
		let c = idToCoords(id),
			newState = getNewCellState(cellType(c), getCell(c), cellNeighbors(c).map(nc => getCell(nc)));
		
		if (newState !== newUnspecifiedStates[c[2]]) {
			newCellStates[id] = newState;
			newSpecifiedCells.add(id);
		}
	}
	
	unspecifiedStates = newUnspecifiedStates;
	cellStates = newCellStates;
	specifiedCells = newSpecifiedCells;
}

function getNewCellState(type, state, neighborStates) {
	var liveNeighbors = neighborStates.filter(state => state === 1).length;
	
	return (
		state === 0
		? (rule[type].birth.includes(liveNeighbors) ? 1 : 0)
		: (
			state === 1
			? (
				rule[type].survival.includes(liveNeighbors)
				? state
				: (rule[type].numStates > 2 ? 2 : 0)
			)
			: (state < rule[type].numStates - 1 ? state + 1 : 0)
		)
	);
}


function captureMouse(type) {
	mouseCaptureType = type;
}

function releaseMouse() {
	mouseCaptureType = false;
}


function getTouchingScrollWidgets(mouseX, mouseY) {
	var result = {};
	scrollWidgetBoxes.map(({name, x, y, width, height}) => {
		result[name] = x <= mouseX && mouseX < x + width && y <= mouseY && mouseY < y + height;
	});
	return result;
}


function sizeCanvas() {
	var prevWidth = width,
		prevHeight = height;
	
	width = Math.floor(window.innerWidth);
	height = Math.floor(window.innerHeight - optionsElem.getBoundingClientRect().height);
	
	cameraWidth = width - scrollBarSize;
	cameraHeight = height - scrollBarSize;
	
	canvas.width = width;
	canvas.height = height;
	
	verticalScrollBarHeight = height - scrollBarSize - scrollBarSize;
	horizontalScrollBarWidth = cameraWidth - scrollBarSize - scrollBarSize;
	
	var verticalStepRange = (scrollRange * cameraHeight)/minScrollInterval,
		horizontalStepRange = (scrollRange * cameraWidth)/minScrollInterval;
	
	verticalScrollHandleLength = verticalScrollBarHeight - verticalStepRange;
	horizontalScrollHandleLength = horizontalScrollBarWidth - horizontalStepRange;
	
	if (verticalScrollHandleLength < scrollBarSize) verticalScrollHandleLength = scrollBarSize;
	if (horizontalScrollHandleLength < scrollBarSize) horizontalScrollHandleLength = scrollBarSize;
	
	verticalScrollInterval = (scrollRange * cameraHeight)/(verticalScrollBarHeight - verticalScrollHandleLength);
	horizontalScrollInterval = (scrollRange * cameraWidth)/(horizontalScrollBarWidth - horizontalScrollHandleLength);
	
	scrollWidgetBoxes = getScrollWidgetBoxes();
}

function getScrollWidgetBoxes() {
	return [
		{
			name: "up",
			x: cameraWidth,
			y: 0,
			width: scrollBarSize,
			height: scrollBarSize
		},
		{
			name: "down",
			x: cameraWidth,
			y: cameraHeight,
			width: scrollBarSize,
			height: scrollBarSize
		},
		{
			name: "left",
			x: 0,
			y: cameraHeight,
			width: scrollBarSize,
			height: scrollBarSize
		},
		{
			name: "right",
			x: cameraWidth - scrollBarSize,
			y: cameraHeight,
			width: scrollBarSize,
			height: scrollBarSize
		},
		{
			name: "vertical",
			x: cameraWidth + 1,
			y: scrollBarSize + (verticalScrollPosition * (verticalScrollBarHeight - verticalScrollHandleLength)),
			width: scrollBarSize - 2,
			height: verticalScrollHandleLength
		},
		{
			name: "horizontal",
			x: scrollBarSize + (horizontalScrollPosition * (horizontalScrollBarWidth - horizontalScrollHandleLength)),
			y: cameraHeight + 1,
			width: horizontalScrollHandleLength,
			height: scrollBarSize - 2
		}
	];
}


function getTilingLineSegments(tiling) {
	var foundSegments = {},
		segments = [];
	
	process(-tiling.width, -tiling.height, "corner");
	process(0, -tiling.height, "top");
	process(-tiling.width, 0, "left");
	process(0, 0, "main");
	
	tiling.lineSegments = segments;
	
	function process(shiftX, shiftY, location) {
		tiling.cells.forEach(({vertices}) => {
			vertices.forEach((vertex, i) => {
				var prevVertex = i ? vertices[i - 1] : vertices[vertices.length - 1];
				vertex = [vertex[0] + shiftX, vertex[1] + shiftY];
				prevVertex = [prevVertex[0] + shiftX, prevVertex[1] + shiftY];
				addSegment(location, vertex, prevVertex);
			});
		});
	}
	
	function addSegment(location, ...vertices) {
		var str = vertices.sort(([xa, ya], [xb, yb]) => (xa - xb) || (ya - yb)).map(v => v.join(",")).join(",");
		if (foundSegments[str]) {
			if (location === "main" && foundSegments[str] !== "main") {
				segments.push({
					from: vertices[0],
					to: vertices[1],
					[foundSegments[str] + "Only"]: true
				});
			}
		} else {
			foundSegments[str] = location;
			if (location === "main") segments.push({from: vertices[0], to: vertices[1]});
		}
	}
}

function getTilingNeighborCounts(tiling) {
	tiling.maxNeighbors = {};
	tiling.cells.forEach(cell => {
		if (tiling.maxNeighbors[cell.type] === undefined || cell.neighbors.length > tiling.maxNeighbors[cell.type]) tiling.maxNeighbors[cell.type] = cell.neighbors.length;
	});
}

function getTilingNeighborsOf(tiling) {
	tiling.cells.forEach((cell, i) => {
		cell.neighbors.forEach(c => {
			var neighbor = tiling.cells[c[2]];
			(neighbor.neighborOf || (neighbor.neighborOf = [])).push([-c[0], -c[1], i]);
		});
	});
}

function getTilingBoundingBox(tiling) {
	var minX, maxX, minY, maxY;
	tiling.cells.forEach(({vertices}) => {
		vertices.forEach(([x, y]) => {
			if (minX === undefined || x < minX) minX = x;
			if (maxX === undefined || x > maxX) maxX = x;
			if (minY === undefined || y < minY) minY = y;
			if (maxY === undefined || y > maxY) maxY = y;
		});
	});
	tiling.boundingLeft = minX;
	tiling.boundingTop = minY;
	tiling.boundingRight = maxX + 1;
	tiling.boundingBottom = maxY + 1;
	tiling.boundingWidth = tiling.boundingRight - tiling.boundingLeft;
	tiling.boundingHeight = tiling.boundingBottom - tiling.boundingTop;
}

function loadTiling() {
	tiling = tilings[tilesInp.value];
	let neighborAmounts = {};
	tiling.cells.forEach(({type, neighbors}) => neighborAmounts[type] = neighbors);
	ruleInp.value = tiling.defaultRule || tiling.shapeOrder.map(type => shapeRules[type] || defaultShapeRules[neighborAmounts[type]] || defaultShapeRules.other).join(", ");
	orderElem.textContent = tiling.shapeOrder.join(", ");
	unspecifiedStates = tiling.cells.map(() => 0);
	startGrid();
	loadShapeRules();
}

function loadShapeRules() {
	var shapeRulesSource = ruleInp.value.split(/\s*,\s*/);
	rule = {};
	ruleMaxNumStates = 0;
	tiling.shapeOrder.forEach((type, i) => {
		shapeRules[type] = shapeRulesSource[i];
		var [survival, birth, numStates] = shapeRules[type].split("/").map((s, i) => i === 2 ? parseInt(s) : [...s].map(s => parseInt(s)));
		rule[type] = {survival, birth, numStates};
		if (numStates > ruleMaxNumStates) ruleMaxNumStates = numStates;
	});
	updateGridCellStates();
	makeStateButtons();
}

function updateGridCellStates() {
	if (cellStates) {
		var newUnspecifiedStates = unspecifiedStates.map((state, i) => adjustState(state, i)),
			newCellStates = {},
			newSpecifiedCells = new Set();
		
		for (let id of specifiedCells) {
			let [, , i] = idToCoords(id),
				state = adjustState(getCell(id), i);
			
			if (state !== newUnspecifiedStates) {
				newCellStates[id] = state;
				newSpecifiedCells.add(id);
			}
		}
		
		unspecifiedStates = newUnspecifiedStates;
		cellStates = newCellStates;
		specifiedCells = newSpecifiedCells;
	}
	
	function adjustState(state, cellI) {
		var numStates = rule[tiling.cells[cellI].type].numStates;
		return state >= numStates ? numStates - 1 : state;
	}
}

function makeStateButtons() {
	if (selectedState >= ruleMaxNumStates) selectedState = ruleMaxNumStates - 1;
	
	statesList.innerHTML = "";
	
	for (let state = 0; state < ruleMaxNumStates; state++) {
		let elem = document.createElement("div"),
			iconElem = document.createElement("div"),
			labelElem = document.createElement("div");
		
		elem.classList.add("stateButton");
		iconElem.classList.add("stateIcon");
		labelElem.classList.add("stateLabel");
		if (state === selectedState) elem.classList.add("selected");
		
		iconElem.style.background = stateColor(stateButtonsBaseColor, ruleMaxNumStates, state);
		labelElem.textContent = state;
		
		elem.addEventListener("click", () => {
			document.querySelector(".stateButton.selected").classList.remove("selected");
			elem.classList.add("selected");
			selectedState = state;
		});
		
		elem.appendChild(iconElem);
		elem.appendChild(labelElem);
		statesList.appendChild(elem);
	}
}

function startGrid() {
	gridWidth = parseInt(repeatXInp.value);
	gridHeight = parseInt(repeatYInp.value);
	cellStates = {};
	specifiedCells = new Set();
	cameraX = (gridWidth * tiling.width)/2;
	cameraY = (gridHeight * tiling.height)/2;
}

function updateGridDimensions(newWidth, newHeight) {
	gridWidth = newWidth;
	gridHeight = newHeight;
	
	var newSpecifiedCells = new Set();
	
	for (let id of specifiedCells) {
		let [x, y] = idToCoords(id);
		if (0 <= x && x < gridWidth && 0 <= y && y < gridHeight) newSpecifiedCells.add(id);
	}
	
	specifiedCells = newSpecifiedCells;
}


function renderPlayingField() {
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, cameraWidth, cameraHeight);
	
	var [minX, maxX, minY, maxY] = getVisibleGridCoords();
	
	for (let state = 0; state < ruleMaxNumStates; state++) {
		tiling.cells.forEach(({type}, i) => {
			if (state < rule[type].numStates) {
				ctx.beginPath();
				
				for (let x = minX; x <= maxX; x++) {
					for (let y = minY; y <= maxY; y++) {
						let c = [x, y, i];
						if (getCell(c) === state) addCellToPath(c);
					}
				}
				
				ctx.fillStyle = stateColor(tiling.colors[type], rule[type].numStates, state);
				ctx.fill();
			}
		});
	}
	
	if (zoom > minBorderZoom) {
		ctx.beginPath();
		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				tiling.lineSegments.forEach(s => {
					if ((!s.leftOnly || x === 0) && (!s.topOnly || y === 0) && (!s.cornerOnly || (x === 0 && y === 0))) {
						ctx.moveTo(...cameraCoords(x * tiling.width + s.from[0], y * tiling.height + s.from[1]));
						ctx.lineTo(...cameraCoords(x * tiling.width + s.to[0], y * tiling.height + s.to[1]));
					}
				});
			}
		}
		ctx.strokeStyle = cellBorderColor;
		ctx.stroke();
	}
	
	function addCellToPath([x, y, i]) {
		tiling.cells[i].vertices.forEach(([vx, vy], i) => {
			ctx[i ? "lineTo" : "moveTo"](...cameraCoords(x * tiling.width + vx, y * tiling.height + vy));
		});
	}
}

function renderScrollBars() {
	ctx.fillStyle = scrollBarColor;
	ctx.fillRect(cameraWidth, 0, scrollBarSize, height);
	ctx.fillRect(0, cameraHeight, cameraWidth, scrollBarSize);
	ctx.fillStyle = scrollButtonHoverColor;
	if (touchingScrollWidgets.up) ctx.fillRect(cameraWidth, 0, scrollBarSize, scrollBarSize);
	if (touchingScrollWidgets.down) ctx.fillRect(cameraWidth, cameraHeight, scrollBarSize, scrollBarSize);
	if (touchingScrollWidgets.left) ctx.fillRect(0, cameraHeight, scrollBarSize, scrollBarSize);
	if (touchingScrollWidgets.right) ctx.fillRect(cameraWidth - scrollBarSize, cameraHeight, scrollBarSize, scrollBarSize);
	renderScrollButtonSymbol(cameraWidth, 0, false, false, false);
	renderScrollButtonSymbol(cameraWidth, cameraHeight, false, false, true);
	renderScrollButtonSymbol(0, cameraHeight, true, false, false);
	renderScrollButtonSymbol(cameraWidth - scrollBarSize, cameraHeight, true, true, false);
	ctx.fillStyle = touchingScrollWidgets.vertical ? scrollHandleHoverColor : scrollHandleColor;
	ctx.fillRect(cameraWidth + 1, scrollBarSize + (verticalScrollPosition * (verticalScrollBarHeight - verticalScrollHandleLength)), scrollBarSize - 2, verticalScrollHandleLength);
	ctx.fillStyle = touchingScrollWidgets.horizontal ? scrollHandleHoverColor : scrollHandleColor;
	ctx.fillRect(scrollBarSize + (horizontalScrollPosition * (horizontalScrollBarWidth - horizontalScrollHandleLength)), cameraHeight + 1, horizontalScrollHandleLength, scrollBarSize - 2);
}

function renderScrollButtonSymbol(x, y, swapCoords, mirrorX, mirrorY) {
	var coords = [
		[
			(scrollBarSize - scrollButtonSymbolSize)/2,
			(scrollBarSize + scrollButtonSymbolLength)/2
		],
		[
			(scrollBarSize + scrollButtonSymbolSize)/2,
			(scrollBarSize + scrollButtonSymbolLength)/2
		],
		[
			scrollBarSize/2,
			(scrollBarSize - scrollButtonSymbolLength)/2
		]
	].map(([vx, vy]) => {
		var vx2 = swapCoords ? vy : vx,
			vy2 = swapCoords ? vx : vy;
		
		if (mirrorX) vx2 = scrollBarSize - 1 - vx2;
		if (mirrorY) vy2 = scrollBarSize - 1 - vy2;
		
		return [
			vx2 + x,
			vy2 + y
		];
	});
	
	ctx.beginPath();
	ctx.moveTo(...coords[0]);
	ctx.lineTo(...coords[1]);
	ctx.lineTo(...coords[2]);
	ctx.fillStyle = scrollButtonSymbolColor;
	ctx.fill();
}


function stateColor(baseColor, numStates, state) {
	return state ? "rgb(" + baseColor.map(v => numStates === 2 ? v : Math.floor(v * (colorScaleMin + ((1 - colorScaleMin) * ((numStates - state - 1)/(numStates - 2)))))).join(",") + ")" : deadColor;
}


function getVisibleGridCoords() {
	var hRange = (cameraWidth/2)/zoom,
		vRange = (cameraHeight/2)/zoom,
		cameraLeft = cameraX - hRange,
		cameraRight = cameraX + hRange,
		cameraTop = cameraY - vRange,
		cameraBottom = cameraY + vRange;
	
	return [
		Math.max(0, Math.ceil((cameraLeft - tiling.boundingRight)/tiling.width)),
		Math.min(gridWidth - 1, Math.floor((cameraRight - tiling.boundingLeft)/tiling.width)),
		Math.max(0, Math.ceil((cameraTop - tiling.boundingBottom)/tiling.height)),
		Math.min(gridHeight - 1, Math.floor((cameraBottom - tiling.boundingTop)/tiling.height))
	];
}


function normalizeCoords(x, y) {
	return [(x + gridWidth)%gridWidth, (y + gridHeight)%gridHeight];
}

function coordsToId(c) {
	return c.join(",");
}

function idToCoords(id) {
	return id.split(",").map(s => parseInt(s));
}

function setCell(cell, state) {
	var id = Array.isArray(cell) ? coordsToId(cell) : cell,
		c = Array.isArray(cell) ? cell : idToCoords(cell),
		type = cellType(c);
	
	state = state < rule[type].numStates ? state : rule[type].numStates - 1;
	cellStates[id] = state;
	if (state === unspecifiedStates[c[2]]) specifiedCells.remove(id);
	else specifiedCells.add(id);
}

function getCell(cell) {
	var id = Array.isArray(cell) ? coordsToId(cell) : cell,
		c = Array.isArray(cell) ? cell : idToCoords(cell);
	
	return specifiedCells.has(id) ? cellStates[id] : unspecifiedStates[c[2]];
}

function cellType(c) {
	if (!Array.isArray(c)) c = idToCoords(c);
	return tiling.cells[c[2]].type;
}

function cellNeighbors(c) {
	if (!Array.isArray(c)) c = idToCoords(c);
	
	var neighborCoords = tiling.cells[c[2]].neighbors.map(coords => [c[0] + coords[0], c[1] + coords[1], coords[2]]);
	
	if (wrapGrid) neighborCoords = neighborCoords.map(([x, y, i]) => {
		return [
			(x + gridWidth)%gridWidth,
			(y + gridHeight)%gridHeight,
			i
		];
	});
	else neighborCoords = neighborCoords.filter(([x, y]) => 0 <= x && x < gridWidth && 0 <= y && y < gridHeight);
	
	return neighborCoords;
}


function eventCanvasCoords(e) {
	var box = canvas.getBoundingClientRect();
	return [e.clientX - (box.x), e.clientY - (box.y)];
}

function getTargetedCell(cx, cy) {
	var coords = gridCoords(cx, cy),
		[minX, maxX, minY, maxY] = getVisibleGridCoords();
	
	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			for (let i = 0; i < tiling.cells.length; i++) {
				let cell = tiling.cells[i];
				if (pointIsInPolygon(coords, cell.vertices.map(([vx, vy]) => [x * tiling.width + vx, y * tiling.height + vy]))) {
					return [x, y, i];
				}
			}
		}
	}
	return false;
}

function pointIsInPolygon(point, vertices) {
	var intersections = 0;
	for (let i = 0; i < vertices.length; i++) {
		let	vertex = vertices[i],
			prevVertex = vertices[(i || vertices.length) - 1],
			minYVertex = vertex[1] < prevVertex[1] ? vertex : prevVertex,
			maxYVertex = minYVertex === vertex ? prevVertex : vertex;
		
		if (minYVertex[1] < point[1] && point[1] < maxYVertex[1] && point[0] < minYVertex[0] + (((point[1] - minYVertex[1])/(maxYVertex[1] - minYVertex[1])) * (maxYVertex[0] - minYVertex[0]))) {
			intersections++;
		}
	}
	return intersections%2 === 1;
}

function cameraCoords(x, y) {
	return [
		((x - cameraX) * zoom) + (cameraWidth/2),
		((y - cameraY) * zoom) + (cameraHeight/2)
	];
}

function gridCoords(x, y) {
	return [
		((x - (cameraWidth/2))/zoom) + cameraX,
		((y - (cameraHeight/2))/zoom) + cameraY
	];
}

function getSharedCameraPosition(gx, gy, cx, cy) {
	return [
		gx - ((cx - (cameraWidth/2))/zoom),
		gy - ((cy - (cameraHeight/2))/zoom)
	];
}

