var DEFAULTSIZE = 20;
var DEFAULTWALLFREQ = 0;
var CANVASSIZE = 400;

/****
 * Handles user interaction with the block selectors
****/
class BlockSelector {
    constructor() {
        this.blocks = {};
        this.active = 'wall';

        var DOMBlocks = document.getElementsByClassName('block');

        for(var i = 0; i < DOMBlocks.length; i++) {
            var block = DOMBlocks[i];

            block.addEventListener('click', this.activate.bind(this));

            this.blocks[block.id] = block;
        }
    }

    deactivateAll() {
        for(key in this.blocks) {
            this.blocks[key].classList.remove('active');
        }
    }

    activate(event) {
        this.active = event.target.id;

        this.deactivateAll();

        event.target.classList.add('active');
    }
}

/****
 * Manages placing different blocks onto the canvaw. Relies on the block selector
 * to know which block needs to be placed
****/
class BlockPlacer {
    constructor(maze, blockSelector, mazeSolver) {
        this.maze = maze;
        this.blockSelector = blockSelector;
        this.mazeSolver = mazeSolver;

        var canvas = document.getElementById('defaultCanvas0')

        canvas.addEventListener('mousemove', this.handleBlockDrawing.bind(this));
        canvas.addEventListener('click', this.setBlock.bind(this));
        canvas.addEventListener('mouseout', this.redrawMaze.bind(this));
    }

    handleBlockDrawing(event) {
        if(mouseIsPressed) {
            this.setBlock();
        } else {
            this.drawBlock();
        }
    }

    getInfo() {
        var width = this.maze.width;
        var xPos = Math.floor(mouseX/width);
        var yPos = Math.floor(mouseY/width);
        var tile = this.blockToTile(this.blockSelector.active);

        return [width, xPos, yPos, tile];
    }

    drawBlock() {
        if(this.maze.distances[0][0] === Infinity) {
            var [width, xPos, yPos, tile] = this.getInfo();

            this.maze.draw();

            this.maze.setFill(tile);
            strokeWeight(3);
            rect(xPos * width, yPos * width, width, width);
        }
    }

    setBlock() {
        if(this.maze.distances[0][0] === Infinity) {
            var [width, xPos, yPos, tile] = this.getInfo();

            this.maze.map[xPos][yPos] = tile;
            this.maze.clearEnds(); // In case start or finish is set

            this.maze.drawTile(xPos, yPos, tile);
            this.maze.draw();
        }
    }

    redrawMaze() {
        if(this.maze.distances[0][0] === Infinity) {
            this.maze.draw();
        }
    }

    blockToTile(block) {
        if(block === 'erase') {
            return 0;
        } else if(block === 'wall') {
            return 1;
        }
    }
}

/****
 * Manages resetting the maze, and handlings settings for maze generation (size, etc)
****/
class SettingsHandler {
    constructor(maze, controlsHandler) {
        this.maze = maze;
        this.controlsHandler = controlsHandler;

        this.sizeField = document.getElementById('maze-size');
        this.wallFreqField = document.getElementById('wall-frequency');
        this.createMazeBtn = document.getElementById('reset-maze');

        this.sizeField.value = maze.size;
        this.wallFreqField.value = maze.wallFreq;

        this.createMazeBtn.addEventListener('click', this.resetMaze.bind(this));
    }

    resetMaze() {
        var size = parseFloat(this.sizeField.value);
        var wallFreq = parseFloat(this.wallFreqField.value);

        this.maze.setUpMaze(size, wallFreq);
        this.maze.resetBuffer();
        this.maze.draw();

        this.controlsHandler.restart();
    }
}

/****
 * Central class, that stores all the information about the layout of the maze
****/
// TODO: seperate the map and solving data into seperate objects
class Maze {
    constructor(size, wallFreq, mazeBuffer) {
        this.mazeBuffer = mazeBuffer;

        this.setUpMaze(size, wallFreq)
    }

    setUpMaze(size, wallFreq) {
        this.size = size;
        this.width = CANVASSIZE/size; // The width, in pixels, of each square
        this.wallFreq = wallFreq;

        this.map = this.create2DArray(size, this.getTile, wallFreq);

        this.resetDistances();
        this.clearEnds();
    }

    resetDistances() {
        this.distances = this.create2DArray(this.size, () => Infinity);
        this.explored = this.create2DArray(this.size, () => false);

        this.explored[0][0] = true;
    }

    create2DArray(size, callback, ...args) {
        var arr = [];

        for(var i = 0 ; i < size; i++) {
            arr.push([]);

            for(var j = 0; j < size; j++) {
                arr[i].push(callback(...args));
            }
        }

        return arr;
    }

    getTile(wallFreq) {
        var tile = Math.random();

        if(tile < wallFreq) {
            return 1; // Wall
        } else {
            return 0; // Empty tile
        }
    }

    clearEnds(map = this.map) {
        var size = map.length

        map[0][0] = 0; // Reset the start line to a blank block
        map[size - 1][size - 1] = 0; // Reset the finish line to a blank block
    }

    setFill(tile, buffer = window) {
        if(tile === 0) {
            buffer.fill(68, 226, 91); // Green
        } else if(tile === 1) {
            buffer.fill(80, 41, 0); // Brown
        } else if(tile === 2) {
            buffer.fill(40, 53, 147); // Blue
        }
    }

    resetBuffer() {
        var buffer = this.mazeBuffer;

        buffer.strokeWeight(1);

        for(var i = 0; i < this.size; i++) {
            for(var j = 0; j < this.size; j++) {
                this.drawTile(i, j, this.map[i][j]);
            }
        }

        if(this.size <= 30) {
            buffer.fill(0);

            buffer.text("A", this.width/2, this.width/2);
            buffer.text("B", CANVASSIZE-this.width/2, CANVASSIZE-this.width/2);
        }
    }

    drawTile(x, y, tile) {
        var buffer = this.mazeBuffer;

        this.setFill(tile, buffer);
        buffer.rect(x * this.width, y * this.width, this.width, this.width);
    };

    draw() {
        image(this.mazeBuffer, 0, 0);
    }

    solved() {
        var size = this.map.length;

        if(this.distances[size - 1][size - 1] !== Infinity) {
            return true;
        }

        return false;
    }

    inBounds(x, y) {
        return x >= 0 && x < this.size && y >=0 && y < this.size
    }
}


/****
 * Data structure that the maze solver uses to perform breadth-first search
****/
class Queue {
    constructor(...elements) {
        this.elements = elements || [];
    }

    push(element) {
        this.elements.push(element);
    }

    pop(elements) {
        return this.elements.shift();
    }

    isEmpty() {
        return this.elements.length === 0;
    }
}

/****
 * Represents a node in the maze solver's graph of tiles to explore
***/
class Node {
    constructor(x, y, distance) {
        this.x = x;
        this.y = y;
        this.distance = distance;
    }
}

/****
 * Contains algorithims for finding the path through a maze
****/
class MazeSolver {
    constructor(maze, pathViewer) {
        this.maze = maze;
        this.pathViewer = pathViewer;
        this.queue;
        this.solving = false;

        this.resetQueue();
    }

    reset() {
        this.maze.resetDistances();
        this.resetQueue();
    }

    resetQueue() {
        this.queue = new Queue(new Node(0, 0, 0));
    }

    step() {
        var width = this.maze.width;
        var map = this.maze.map;
        var distances = this.maze.distances;
        var explored = this.maze.explored;

        // Get the next node
        var node = this.queue.pop();

        // Update the map distances for the node
        distances[node.x][node.y] = node.distance;

        // Put a rectangle down to mark that the tile was processed
        strokeWeight(1);
        fill(0, 0, 0, 128);
        rect(node.x * width, node.y * width, width, width);

        // Get all the neighboring tiles that haven't been explored
        var neighbors = this.getNeighbors(node.x, node.y)

        // Determine the distance for each neighbor, and add them to the queue
        for(var i = 0; i < neighbors.length; i++) {
            var x = neighbors[i].x;
            var y = neighbors[i].y;

            var cost;
            if(map[x][y] === 0) {
                cost = 1;
            } else if(map[x][y] === 2) {
                cost = 2;
	        }

            var newNode = new Node(x, y, node.distance + cost)

            explored[x][y] = true;

            this.queue.push(newNode);
        }
    }

    getNeighbors(x, y) {
        var potentialNeighbors = [{x: x + 1, y: y}, {x: x - 1, y: y}, {x: x, y : y + 1}, {x:x, y: y - 1}];
        var validNeighbors = [];

        // For each potential neighbor, make sure it is in bounds and free to explore
        for(var i = 0; i < potentialNeighbors.length; i++) {
            var p = potentialNeighbors[i];

            if(this.maze.inBounds(p.x, p.y) && this.testTileFree(p.x, p.y)) {
                validNeighbors.push(p);
            }
        }

        return validNeighbors;
    }

    testTileFree(x, y) {
        return this.maze.map[x][y] !== 1 && this.maze.explored[x][y] === false;
    }

    canStep() {
        return !this.maze.solved() && !this.queue.isEmpty()
    }

    solveLoop() {
        if(this.solving) {
            if(this.maze.solved()) {
                this.pathViewer.draw();
                this.pause();

            } else if(this.queue.isEmpty()) {
                console.error("The maze has no solution");
                this.pause();

            } else {
                this.step();
            }
        }

    }

    skip() {
        while(this.canStep()) {
            this.step();
        }

        if(this.maze.solved()) {
            this.pathViewer.draw();
        }
    }

    play() {
        this.solving = true;
    }

    pause() {
        this.solving = false;
    }
}

/****
 * Handles user input into the control buttons (play, step, skip) to control
 * how fast the maze solver solves the maze
****/
class ControlsHandler {
    constructor(mazeSolver) {
        this.mazeSolver = mazeSolver;

        this.playButton = document.getElementById('play');
        this.pauseButton = document.getElementById('pause');

        document.getElementById('play').addEventListener('click', this.play.bind(this));
        document.getElementById('pause').addEventListener('click', this.pause.bind(this));
        document.getElementById('step').addEventListener('click', this.step.bind(this));
        document.getElementById('skip').addEventListener('click', this.skip.bind(this));
        document.getElementById('restart').addEventListener('click', this.restart.bind(this));
    }

    play() {
        if(this.mazeSolver.canStep()) {
            this.mazeSolver.play();

            this.pauseButton.classList.remove('hidden');
            this.playButton.classList.add('hidden');
        }
    }

    pause() {
        this.mazeSolver.pause();

        this.playButton.classList.remove('hidden');
        this.pauseButton.classList.add('hidden');
    }

    step() {
        this.pause();

        if(this.mazeSolver.canStep()) {
            this.mazeSolver.step();
        }
    }

    skip() {
        this.pause();

        this.mazeSolver.skip();
    }

    restart() {
        this.pause();
        this.mazeSolver.pause();

        this.mazeSolver.maze.draw();

        this.mazeSolver.reset();
    }
}

class PathViewer {
    constructor(maze) {
        this.maze = maze;
    }

    draw() {
        var x = this.maze.size - 1;
        var y = this.maze.size - 1;

        while(true) {
            var xCoord = (x * this.maze.width)
            var yCoord = (y * this.maze.width)

            strokeWeight(1);
            fill(255, 255, 0);
            rect(xCoord, yCoord, this.maze.width, this.maze.width);

            if(x === 0 && y === 0) {
                return;
            }

            var potentialNext = [{x: x + 1, y: y}, {x: x - 1, y: y}, {x: x, y : y + 1}, {x:x, y: y - 1}];
            var bestDistance = Infinity;
            var bestCoord;

            for(var i = 0; i < potentialNext.length; i++) {
                var nextX = potentialNext[i].x;
                var nextY = potentialNext[i].y;

                if(this.maze.inBounds(nextX, nextY) && this.maze.distances[nextX][nextY] < bestDistance) {
                    bestDistance = this.maze.distances[nextX][nextY];
                    bestCoord = {x:nextX, y:nextY};
                }
            }

            x = bestCoord.x;
            y = bestCoord.y;
        }
    }
}

function setup() {
    canvas = createCanvas(CANVASSIZE, CANVASSIZE);
    canvas.parent('canvas-container');

    mazeBuffer = createGraphics(CANVASSIZE, CANVASSIZE);
    mazeBuffer.textAlign(CENTER, CENTER);

    var maze = new Maze(DEFAULTSIZE, DEFAULTWALLFREQ, mazeBuffer);
    var pathViewer = new PathViewer(maze);
    var mazeSolver = new MazeSolver(maze, pathViewer);
    var controlsHandler = new ControlsHandler(mazeSolver);
    var settingsHandler = new SettingsHandler(maze, controlsHandler);
    var blockSelector = new BlockSelector(maze);
    var blockPlacer = new BlockPlacer(maze, blockSelector, mazeSolver);

    maze.resetBuffer();
    maze.draw();

    window.setInterval(mazeSolver.solveLoop.bind(mazeSolver), 1);
}
