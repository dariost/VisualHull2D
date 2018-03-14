'use strict';

class VisualHull2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.backgroundColor = "#7f7f7f";
        this.clear();
        this.vertices = new Array();
        this.lines = new Map();
    }

    clear() {
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.width, this.height);
    }

    generateVertices(n) {
        this.vertices = new Array();
        const border = 50;
        const size = 15;
        const minDistance = 15;
        log.write("[INFO] Generating " + n + " points");
        for(let i = 0; i < n; i++) {
            const x = parseInt(Math.random() * (this.width - 2 * border) + border);
            const y = parseInt(Math.random() * (this.height - 2 * border) + border);
            let poisoned = false;
            for(let point of this.vertices) {
                if(Math.hypot(x - point.x, y - point.y) - 2 * size < minDistance) {
                    poisoned = true;
                    break;
                }
            }
            if(poisoned) {
                i--;
                continue;
            }
            this.vertices.push(new Point2D(this.context, this.backgroundColor, x, y, size, null, "black"));
            log.write("[INFO] Point #" + i + ": (" + x + "; " + y + ")");
        }
    }

    reset() {
        this.lines.clear();
        for(let point of this.vertices) {
            point.reset();
        }
    }

    draw() {
        this.clear();
        for(let line of this.lines.values()) {
            line.draw();
        }
        for(let point of this.vertices) {
            point.draw();
        }
    }
}

class Point2D {
    constructor(context, backgroundColor, x, y, size, number, color) {
        this.context = context;
        this.backgroundColor = backgroundColor;
        this.x = x;
        this.y = y;
        this.size = size;
        this.number = number;
        this.color = color;
    }

    draw() {
        this.context.lineWidth = 1;
        this.context.fillStyle = this.backgroundColor;
        this.context.beginPath();
        this.context.arc(this.x, this.y, this.size, 0.0, 2.0 * Math.PI);
        this.context.fill();
        this.context.strokeStyle = this.color;
        this.context.beginPath();
        this.context.arc(this.x, this.y, this.size, 0.0, 2.0 * Math.PI);
        this.context.stroke();
        if(this.number != null && this.number != undefined) {
            this.context.fillStyle = this.color;
            this.context.font = "" + this.size + "px monospace";
            this.context.textAlign = "center";
            this.context.textBaseline = "middle";
            this.context.fillText(this.number, this.x, this.y);
        }
    }

    reset() {
        this.color = "black";
        this.number = null;
    }
}

class Line2D {
    constructor(context, x0, y0, x1, y1, color, width) {
        this.context = context;
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.color = color;
        this.width = width;
    }

    draw() {
        this.context.lineWidth = this.width;
        this.context.strokeStyle = this.color;
        this.context.beginPath();
        this.context.moveTo(this.x0, this.y0);
        this.context.lineTo(this.x1, this.y1);
        this.context.stroke();
    }
}

class Logger {
    constructor(logger) {
        this.logger = logger;
        this.reset();
    }

    reset() {
        this.logger.innerHTML = "";
        this.logger.scrollTop = this.logger.scrollHeight;
    }

    write(message) {
        this.logger.innerHTML += message + "\n";
        this.logger.scrollTop = this.logger.scrollHeight;
    }
}

let log = new Logger(document.getElementById("log"));
let vh = new VisualHull2D(document.getElementById("cv"));
let controls = [
    document.getElementById("generate"),
    document.getElementById("naive")
];

function generate() {
    const n = parseInt(prompt("Number of points", "8")) || 8;
    if(n < 3 || n > 64) {
        alert("Number of points must be in [3; 64]");
        return;
    }
    vh.generateVertices(n);
    vh.draw();
}

function toggleControls(toggle) {
    for(let control of controls) {
        control.disabled = !toggle;
    }
}

let current_generator = null;
let current_moves = 0;
let stop = false;

function start(generator) {
    current_generator = generator();
    toggleControls(false);
    current_moves = 0;
    stop = false;
    execute();
}

function execute() {
    let result = current_generator.next();
    if(result.done || stop) {
        vh.reset();
        toggleControls(true);
        if(!stop) {
            log.write("[INFO] Total operations: " + current_moves);
        }
    } else {
        vh.draw();
        log.write(result.value);
        current_moves++;
        let next_wait = 1000.0 / Math.pow(2.0, (parseFloat(document.getElementById("speed").value)) || 1.0);
        if(next_wait < 4.0) {
            window.requestAnimationFrame(execute);
        } else {
            setTimeout(execute, next_wait);
        }
    }
}

function* naive() {
    let n = vh.vertices.length;
    if(n < 3) {
        return;
    }
    for(let i = 0; i < n; i++) {
        vh.vertices[i].number = i;
    }
    yield "[NAIVE] Labeled points randomly";
    for(let i = 0; i < n; i++) {
        for(let j = i + 1; j < n; j++) {
            let line = new Line2D(vh.context, vh.vertices[i].x, vh.vertices[i].y,
                                  vh.vertices[j].x, vh.vertices[j].y, "magenta", 10);
            let line_id = [i, j];
            vh.lines.set(line_id, line);
            let prev_colors = new Array();
            for(let k = 0; k < n; k++) {
                prev_colors.push(vh.vertices[k].color);
            }
            vh.vertices[i].color = "magenta";
            vh.vertices[j].color = "magenta";
            yield "[NAIVE] Testing " + [i, j];
            let rank = [0, 0];
            for(let k = 0; k < n; k++) {
                if(k == i || k == j) {
                    continue;
                }
                let cross = cross_product(vector(vh.vertices[i], vh.vertices[j]), vector(vh.vertices[i], vh.vertices[k]));
                if(cross > 0.0) {
                    vh.vertices[k].color = "red";
                    rank[0]++;
                } else {
                    vh.vertices[k].color = "blue";
                    rank[1]++;
                }
                yield "[NAIVE] Classified point " + k;
            }
            vh.lines.delete(line_id);
            for(let k = 0; k < n; k++) {
                vh.vertices[k].color = prev_colors[k];
            }
            if(rank[0] == 0 || rank[1] == 0) {
                vh.vertices[i].color = "green";
                vh.vertices[j].color = "green";
                line = new Line2D(vh.context, vh.vertices[i].x, vh.vertices[i].y,
                                  vh.vertices[j].x, vh.vertices[j].y, "green", 10);
                vh.lines.set(line_id, line);
                yield "[NAIVE] Found edge!";
            }
        }
    }
    yield "[NAIVE] Complete";
}

function vector(a, b) {
    return {
        x: b.x - a.x,
        y: b.y - a.y
    };
}

function cross_product(a, b) {
    return a.x * b.y - a.y * b.x;
}
