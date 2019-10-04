'use strict';

const MAX_POINTS = 256;
let LINE_SIZE = 10;

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
        const border = 25;
        let size;
        if(n > 128) {
            size = 7;
            LINE_SIZE = 5;
        }
        else if(n > 64) {
            size = 10;
            LINE_SIZE = 7;
        } else {
            size = 15;
            LINE_SIZE = 10;
        }
        const minDistance = 10;
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
            for(let i = 0; i < this.vertices.length && !poisoned; i++) {
                for(let j = i + 1; j < this.vertices.length; j++) {
                    let v = Math.abs(cross_product(vector(this.vertices[i], this.vertices[j]), vector(this.vertices[i], {x: x, y: y})));
                    if(v < 1.0) {
                        poisoned = true;
                        break;
                    }
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
    document.getElementById("naive"),
    document.getElementById("quickhull"),
    document.getElementById("smart_naive"),
    document.getElementById("gift"),
    document.getElementById("chain"),
    document.getElementById("graham")
];

function generate() {
    const n = parseInt(prompt("Number of points", "8")) || 8;
    if(n < 3 || n > MAX_POINTS) {
        alert("Number of points must be in [3; " + MAX_POINTS + "]");
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

function generate_id(a, b) {
    if(a < b)
        return a * MAX_POINTS + b;
    else
        return b * MAX_POINTS + a;
}

function generate_unique_id(a, b) {
    return a * MAX_POINTS + b;
}

function* gift() {
    let n = vh.vertices.length;
    if(n < 3) {
        return;
    }
    for(let i = 0; i < n; i++) {
        vh.vertices[i].number = i;
    }
    yield "[GIFT] Labeled points randomly";
    let furthest = [0, 0, 0, 0];
    for(let i = 1; i < n; i++) {
        if(vh.vertices[i].x < vh.vertices[furthest[0]].x)
            furthest[0] = i;
        if(vh.vertices[i].x > vh.vertices[furthest[1]].x)
            furthest[1] = i;
        if(vh.vertices[i].y < vh.vertices[furthest[2]].y)
            furthest[2] = i;
        if(vh.vertices[i].y > vh.vertices[furthest[3]].y)
            furthest[3] = i;
    }
    furthest.sort();
    let starting_point = furthest[0];
    let last_point = starting_point;
    vh.vertices[starting_point].color = "green";
    yield "[GIFT] Found starting point " + starting_point;
    furthest = null;
    while(furthest != starting_point) {
        let best_point = null;
        let colors = new Array();
        for(let i = 0; i < n; i++) {
            colors[i] = vh.vertices[i].color;
            if(i == last_point) {
                continue;
            }
            vh.vertices[i].color = "cyan";
            if(best_point == null) {
                vh.vertices[i].color = "yellow";
                best_point = i;
            } else {
                let v = cross_product(vector(vh.vertices[last_point], vh.vertices[best_point]), vector(vh.vertices[last_point], vh.vertices[i]));
                if(v < 0.0) {
                    vh.vertices[best_point].color = "cyan";
                    vh.vertices[i].color = "yellow";
                    best_point = i;
                }
            }
            yield "[GIFT] Testing point " + i;
        }
        vh.lines.set(generate_unique_id(last_point, best_point),
                     new Line2D(vh.context, vh.vertices[last_point].x, vh.vertices[last_point].y,
                                vh.vertices[best_point].x, vh.vertices[best_point].y, "green", LINE_SIZE));
        furthest = best_point;
        last_point = best_point;
        vh.vertices[best_point].color = "green";
        for(let i = 0; i < n; i++) {
            if(i == best_point) {
                continue;
            }
            vh.vertices[i].color = colors[i];
        }
        yield "[GIFT] Found convex hull point " + best_point;
    }
    yield "[GIFT] Completed";
}

function* quickhull() {
    let n = vh.vertices.length;
    if(n < 3) {
        return;
    }
    for(let i = 0; i < n; i++) {
        vh.vertices[i].number = i;
    }
    yield "[QUICKHULL] Labeled points randomly";
    let furthest = [0, 0, 0, 0];
    for(let i = 1; i < n; i++) {
        if(vh.vertices[i].x < vh.vertices[furthest[0]].x)
            furthest[0] = i;
        if(vh.vertices[i].x > vh.vertices[furthest[1]].x)
            furthest[1] = i;
        if(vh.vertices[i].y < vh.vertices[furthest[2]].y)
            furthest[2] = i;
        if(vh.vertices[i].y > vh.vertices[furthest[3]].y)
            furthest[3] = i;
    }
    furthest.sort();
    vh.vertices[furthest[0]].color = "green";
    vh.vertices[furthest[3]].color = "green";
    let initial_id = generate_id(furthest[0], furthest[3]);
    vh.lines.set(initial_id, new Line2D(vh.context, vh.vertices[furthest[0]].x, vh.vertices[furthest[0]].y,
                                        vh.vertices[furthest[3]].x, vh.vertices[furthest[3]].y, "magenta", LINE_SIZE));
    yield "[QUICKHULL] Found initial points";
    let initial_division = [new Array(), new Array()];
    for(let i = 0; i < n; i++) {
        if(i == furthest[0] || i == furthest[3]) {
            continue;
        }
        let cross = cross_product(vector(vh.vertices[furthest[0]], vh.vertices[furthest[3]]),
                                  vector(vh.vertices[furthest[0]], vh.vertices[i]));
        if(cross > 0.0) {
            vh.vertices[i].color = "red";
            initial_division[0].push(i);
        } else {
            vh.vertices[i].color = "blue";
            initial_division[1].push(i);
        }
        yield "[QUICKHULL] Initial division for " + i;
    }
    for(let i = 0; i < n; i++) {
        if(i == furthest[0] || i == furthest[3]) {
            continue;
        }
        vh.vertices[i].color = "black";
    }
    if(initial_division[0].length == 0 || initial_division[1].length == 0) {
        vh.lines.delete(initial_id);
        vh.lines.set(initial_id, new Line2D(vh.context, vh.vertices[furthest[0]].x, vh.vertices[furthest[0]].y,
                                            vh.vertices[furthest[3]].x, vh.vertices[furthest[3]].y, "green", LINE_SIZE));
    }
    let queue = new Array();
    for(let i = 0; i < 2; i++) {
        if(initial_division[i].length == 0) {
            continue;
        }
        queue.push({
            pivot: [furthest[0], furthest[3]],
            points: initial_division[i]
        });
    }
    while(queue.length > 0) {
        let first = queue.shift();
        let far = first.points[0];
        for(let i of first.points) {
            let dist_far = distance(vector(vh.vertices[first.pivot[0]], vh.vertices[far]),
                                    vector(vh.vertices[first.pivot[0]], vh.vertices[first.pivot[1]]));
            let dist_i = distance(vector(vh.vertices[first.pivot[0]], vh.vertices[i]),
                                  vector(vh.vertices[first.pivot[0]], vh.vertices[first.pivot[1]]));
            if(dist_i >= dist_far) {
                vh.vertices[far].color = "cyan";
                far = i;
                vh.vertices[far].color = "yellow";
            } else {
                vh.vertices[i].color = "cyan";
            }
            yield "[QUICKHULL] Calculated distance for " + i;
        }
        vh.vertices[far].color = "green";
        vh.lines.set(generate_id(first.pivot[1], far),
                     new Line2D(vh.context, vh.vertices[far].x, vh.vertices[far].y,
                                vh.vertices[first.pivot[1]].x, vh.vertices[first.pivot[1]].y, "magenta", LINE_SIZE));
        vh.lines.set(generate_id(first.pivot[0], far),
                     new Line2D(vh.context, vh.vertices[first.pivot[0]].x, vh.vertices[first.pivot[0]].y,
                                vh.vertices[far].x, vh.vertices[far].y, "magenta", LINE_SIZE));
        let new_division = [new Array(), new Array()];
        for(let i of first.points) {
            if(i == far) {
                continue;
            }
            let v1 = vector(vh.vertices[first.pivot[0]], vh.vertices[first.pivot[1]]);
            let f1 = vector(vh.vertices[first.pivot[0]], vh.vertices[far]);
            let p1 = vector(vh.vertices[first.pivot[0]], vh.vertices[i]);
            let dv1 = cross_product(v1, p1);
            let df1 = cross_product(f1, p1);
            let v2 = vector(vh.vertices[first.pivot[1]], vh.vertices[first.pivot[0]]);
            let f2 = vector(vh.vertices[first.pivot[1]], vh.vertices[far]);
            let p2 = vector(vh.vertices[first.pivot[1]], vh.vertices[i]);
            let dv2 = cross_product(v2, p2);
            let df2 = cross_product(f2, p2);
            if(same_sign(dv1, df1) && same_sign(dv2, df2)) {
                log.write("!!!ALERT!!!");
            }
            if(same_sign(dv1, df1)) {
                vh.vertices[i].color = "red";
                new_division[0].push(i);
            } else if(same_sign(dv2, df2)) {
                vh.vertices[i].color = "blue";
                new_division[1].push(i);
            } else {
                vh.vertices[i].color = "black";
            }
            yield "[QUICKHULL] Classified " + i;
        }
        for(let i of first.points) {
            if(i == far) {
                continue;
            }
            vh.vertices[i].color = "black";
        }
        if(vh.lines.has(generate_id(first.pivot[0], first.pivot[1])) && vh.lines.get(generate_id(first.pivot[0], first.pivot[1])).color != "green")
            vh.lines.delete(generate_id(first.pivot[0], first.pivot[1]));
        for(let i = 0; i < 2; i++) {
            if(new_division[i].length == 0) {
                vh.lines.set(generate_id(first.pivot[i], far),
                             new Line2D(vh.context, vh.vertices[first.pivot[i]].x, vh.vertices[first.pivot[i]].y,
                                        vh.vertices[far].x, vh.vertices[far].y, "green", LINE_SIZE));
            } else {
                queue.push({
                    pivot: [first.pivot[i], far],
                    points: new_division[i]
                });
            }
        }
    }
    yield "[QUICKHULL] Completed";
}

function* smart_naive() {
    let n = vh.vertices.length;
    if(n < 3) {
        return;
    }
    for(let i = 0; i < n; i++) {
        vh.vertices[i].number = i;
    }
    yield "[SMARTNAIVE] Labeled points randomly";
    for(let i = 0; i < n; i++) {
        for(let j = i + 1; j < n; j++) {
            let line = new Line2D(vh.context, vh.vertices[i].x, vh.vertices[i].y,
                                  vh.vertices[j].x, vh.vertices[j].y, "magenta", LINE_SIZE);
            let line_id = [i, j];
            vh.lines.set(line_id, line);
            let prev_colors = new Array();
            for(let k = 0; k < n; k++) {
                prev_colors.push(vh.vertices[k].color);
            }
            vh.vertices[i].color = "magenta";
            vh.vertices[j].color = "magenta";
            yield "[SMARTNAIVE] Testing " + [i, j];
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
                yield "[SMARTNAIVE] Classified point " + k;
                if(rank[0] > 0 && rank[1] > 0) {
                    yield "[SMARTNAIVE] Early break";
                    break;
                }
            }
            vh.lines.delete(line_id);
            for(let k = 0; k < n; k++) {
                vh.vertices[k].color = prev_colors[k];
            }
            if(rank[0] == 0 || rank[1] == 0) {
                vh.vertices[i].color = "green";
                vh.vertices[j].color = "green";
                line = new Line2D(vh.context, vh.vertices[i].x, vh.vertices[i].y,
                                  vh.vertices[j].x, vh.vertices[j].y, "green", LINE_SIZE);
                vh.lines.set(line_id, line);
                yield "[SMARTNAIVE] Found edge!";
            }
        }
    }
    yield "[SMARTNAIVE] Complete";
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
                                  vh.vertices[j].x, vh.vertices[j].y, "magenta", LINE_SIZE);
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
                                  vh.vertices[j].x, vh.vertices[j].y, "green", LINE_SIZE);
                vh.lines.set(line_id, line);
                yield "[NAIVE] Found edge!";
            }
        }
    }
    yield "[NAIVE] Complete";
}

function* chain() {
    let n = vh.vertices.length;
    if(n < 3) {
        return;
    }
    yield "[CHAIN] Labeling points in order";
    let points = new Array();
    for(let i = 0; i < n; i++) {
        points.push(i);
    }
    points.sort(function(a, b) {
        if(vh.vertices[a].x < vh.vertices[b].x)
            return -1;
        else if(vh.vertices[a].x > vh.vertices[b].x)
            return 1;
        else if(vh.vertices[a].y < vh.vertices[b].y)
            return -1;
        else if(vh.vertices[a].y > vh.vertices[b].y)
            return 1;
        else
            return 0;
    });
    for(let i = 0; i < n; i++) {
        vh.vertices[points[i]].number = i;
        current_moves -= 1;
        yield "[CHAIN] Labeled point " + i;
    }
    let lower = new Array();
    for(let i = 0; i < n; i++) {
        vh.vertices[points[i]].color = "magenta";
        if(lower.length > 0) {
            vh.lines.set(generate_unique_id(lower[lower.length - 1], points[i]),
                         new Line2D(vh.context, vh.vertices[lower[lower.length - 1]].x, vh.vertices[lower[lower.length - 1]].y,
                                    vh.vertices[points[i]].x, vh.vertices[points[i]].y, "magenta", LINE_SIZE));
        }
        current_moves -= 1;
        yield "[CHAIN] Trying with point " + i;
        while(lower.length > 1 && cross_product(vector(vh.vertices[lower[lower.length - 2]], vh.vertices[lower[lower.length - 1]]),
                                                vector(vh.vertices[lower[lower.length - 1]], vh.vertices[points[i]])) > 0.0) {
            vh.lines.delete(generate_unique_id(lower[lower.length - 2], lower[lower.length - 1]));
            vh.lines.delete(generate_unique_id(lower[lower.length - 1], points[i]));
            vh.vertices[lower[lower.length - 1]].color = "black";
            lower.pop();
            vh.lines.set(generate_unique_id(lower[lower.length - 1], points[i]),
                         new Line2D(vh.context, vh.vertices[lower[lower.length - 1]].x, vh.vertices[lower[lower.length - 1]].y,
                                    vh.vertices[points[i]].x, vh.vertices[points[i]].y, "magenta", LINE_SIZE));
            yield "[CHAIN] Removing wrong turn";
        }
        lower.push(points[i]);
    }
    for(let id of lower) {
        vh.vertices[id].color = "green";
    }
    for(let line of vh.lines.values()) {
        line.color = "green";
    }
    yield "[CHAIN] Lower part completed";
    let upper = new Array();
    for(let i = n - 1; i >= 0; i--) {
        vh.vertices[points[i]].color = "magenta";
        if(upper.length > 0) {
            vh.lines.set(generate_unique_id(upper[upper.length - 1], points[i]),
                         new Line2D(vh.context, vh.vertices[upper[upper.length - 1]].x, vh.vertices[upper[upper.length - 1]].y,
                                    vh.vertices[points[i]].x, vh.vertices[points[i]].y, "magenta", LINE_SIZE));
        }
        current_moves -= 1;
        yield "[CHAIN] Trying with point " + i;
        while(upper.length > 1 && cross_product(vector(vh.vertices[upper[upper.length - 2]], vh.vertices[upper[upper.length - 1]]),
                                                vector(vh.vertices[upper[upper.length - 1]], vh.vertices[points[i]])) > 0.0) {
            vh.lines.delete(generate_unique_id(upper[upper.length - 2], upper[upper.length - 1]));
            vh.lines.delete(generate_unique_id(upper[upper.length - 1], points[i]));
            if(lower.indexOf(upper[upper.length - 1]) == -1)
                vh.vertices[upper[upper.length - 1]].color = "black";
            else
                vh.vertices[upper[upper.length - 1]].color = "green";
            upper.pop();
            vh.lines.set(generate_unique_id(upper[upper.length - 1], points[i]),
                         new Line2D(vh.context, vh.vertices[upper[upper.length - 1]].x, vh.vertices[upper[upper.length - 1]].y,
                                    vh.vertices[points[i]].x, vh.vertices[points[i]].y, "magenta", LINE_SIZE));
            yield "[CHAIN] Removing wrong turn";
        }
        upper.push(points[i]);
    }
    for(let id of upper) {
        vh.vertices[id].color = "green";
    }
    for(let line of vh.lines.values()) {
        line.color = "green";
    }
    yield "[CHAIN] Complete";
}

function* graham() {
    let n = vh.vertices.length;
    if(n < 3) {
        return;
    }
    yield "[GRAHAM] Labeling points in order";
    let points = new Array();
    let smallest_point = 0;
    for(let i = 0; i < n; i++) {
        points.push(i);
        if(vh.vertices[i].x<vh.vertices[smallest_point].x)smallest_point=i;
    }
    let tmp=vh.vertices[0];
    vh.vertices[0]=vh.vertices[smallest_point];
    vh.vertices[smallest_point]=tmp;
    smallest_point=0;
    points.sort(function(a, b) {
        if(a==0)
            return -1;
        else if (b==0)
            return 1;
        else {
            let cros = cross_product(vector(vh.vertices[0],vh.vertices[a]),vector(vh.vertices[0],vh.vertices[b]));
            if (cros<0.0)
                return -1;
            else if (cros>0.0)
                return 1;
            else {
                if(distance(vh.vertices[0],vh.vertices[a])<distance(vh.vertices[0],vh.vertices[b]))
                    return -1;
                else if(distance(vh.vertices[0],vh.vertices[a])>distance(vh.vertices[0],vh.vertices[b]))
                    return 1;
                else
                    return 0;
            }
        }
    });
    for(let i = 0; i < n; i++) {
        vh.vertices[points[i]].number = i;
        current_moves -= 1;
        yield "[GRAHAM] Labeled point " + i;
    }
    let hull = new Array();
    for(let i = 0; i < n; i++) {
        if(i>0)vh.vertices[points[i]].color = "magenta";
        else vh.vertices[points[i]].color = "blue";
        if(hull.length > 0) {
            vh.lines.set(generate_unique_id(hull[hull.length - 1], points[i]),
                         new Line2D(vh.context, vh.vertices[hull[hull.length - 1]].x, vh.vertices[hull[hull.length - 1]].y,
                                    vh.vertices[points[i]].x, vh.vertices[points[i]].y, "magenta", LINE_SIZE));
        }
        current_moves -= 1;
        yield "[GRAHAM] Trying with point " + i;
        while(hull.length > 1 && cross_product(vector(vh.vertices[hull[hull.length - 2]], vh.vertices[hull[hull.length - 1]]),
                                                vector(vh.vertices[hull[hull.length - 1]], vh.vertices[points[i]])) > 0.0) {
            vh.lines.delete(generate_unique_id(hull[hull.length - 2], hull[hull.length - 1]));
            vh.lines.delete(generate_unique_id(hull[hull.length - 1], points[i]));
            vh.vertices[hull[hull.length - 1]].color = "black";
            hull.pop();
            vh.lines.set(generate_unique_id(hull[hull.length - 1], points[i]),
                         new Line2D(vh.context, vh.vertices[hull[hull.length - 1]].x, vh.vertices[hull[hull.length - 1]].y,
                                    vh.vertices[points[i]].x, vh.vertices[points[i]].y, "magenta", LINE_SIZE));
            yield "[GRAHAM] Removing wrong turn";
        }
        hull.push(points[i]);
    }
    vh.lines.set(generate_unique_id(hull[hull.length - 1], hull[0]),
        new Line2D(vh.context, vh.vertices[hull[hull.length - 1]].x, vh.vertices[hull[hull.length - 1]].y,
        vh.vertices[0].x, vh.vertices[0].y, "magenta", LINE_SIZE));
    for(let id of hull) {
        vh.vertices[id].color = "green";
    }
    for(let line of vh.lines.values()) {
        line.color = "green";
    }
    yield "[GRAHAM] Complete";
}

function vector(a, b) {
    return {
        x: b.x - a.x,
        y: b.y - a.y
    };
}

function same_sign(a, b) {
    return (a >= 0.0 && b >= 0.0) || (a <= 0.0 && b <= 0.0);
}

function norm(a) {
    return Math.hypot(a.x, a.y);
}

function normalize(a) {
    return {
        x: a.x / norm(a),
        y: a.y / norm(a)
    };
}

function dot_product(a, b) {
    return a.x * b.x + a.y * b.y;
}

function cross_product(a, b) {
    return a.x * b.y - a.y * b.x;
}

function distance(p, v) {
    let nv = normalize(v);
    let scale = dot_product(p, nv);
    nv.x *= scale;
    nv.y *= scale;
    return norm(vector(nv, p));
}
