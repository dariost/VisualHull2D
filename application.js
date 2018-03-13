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
            this.vertices.push(new Point2D(this.context, this.backgroundColor, x, y, size, null));
            log.write("[INFO] Point #" + i + ": (" + x + "; " + y + ")");
        }
    }

    drawPoints(color) {
        for(let point of this.vertices) {
            point.draw(color);
        }
    }

    drawBasic() {
        this.clear();
        this.drawPoints("black");
    }
}

class Point2D {
    constructor(context, backgroundColor, x, y, size, number) {
        this.context = context;
        this.backgroundColor = backgroundColor;
        this.x = x;
        this.y = y;
        this.size = size;
        this.number = number;
    }

    draw(color) {
        this.context.fillStyle = this.backgroundColor;
        this.context.beginPath();
        this.context.arc(this.x, this.y, this.size, 0.0, 2.0 * Math.PI);
        this.context.fill();
        this.context.strokeStyle = color;
        this.context.beginPath();
        this.context.arc(this.x, this.y, this.size, 0.0, 2.0 * Math.PI);
        this.context.stroke();
        if(this.number != null && this.number != undefined) {
            this.context.fillStyle = color;
            this.context.font = "" + this.size + "px monospace";
            this.context.textAlign = "center";
            this.context.textBaseline = "middle";
            this.context.fillText(this.number, this.x, this.y);
        }
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
];

function generate() {
    const n = parseInt(prompt("Number of points", "8")) || 8;
    if(n < 3 || n > 64) {
        alert("Number of points must be in [3; 64]");
        return;
    }
    vh.generateVertices(n);
    vh.drawBasic();
}

function toggleControls(toggle) {
    for(let control of controls) {
        control.disabled = !toggle;
    }
}
