The key is to use polygon vertices as the common format between CSS and Matter.js.

Your CSS shape is a polygon with 9 points. You can convert those percentage coordinates into pixel coordinates for Matter.js, create a physics body with `Matter.Bodies.fromVertices()`, and convert the body's vertices back into CSS percentages.

There is one important limitation: CSS can represent almost any polygon, but a single Matter.js collision hull must be convex. Concave shapes can be represented by multiple convex parts, and circles or curved shapes need to be approximated by polygons if you want to convert them to `clip-path: polygon(...)`. matter-js 0.20.0

+2

## 1. What shapes can you convert?

| Shape | CSS `clip-path` | Matter.js | Conversion |
| --- | --- | --- | --- |
| Rectangle / triangle | `polygon()` | Rectangle / polygon body | Exact |
| Convex polygon | `polygon()` | `Bodies.fromVertices()` | Exact geometry |
| Concave polygon | `polygon()` | Compound body via `fromVertices()` | Requires decomposition |
| Circle / ellipse | `circle()` / `ellipse()` | `Bodies.circle()` | Approximate as polygon |
| Rounded polygon | `polygon()` with many points | Multiple vertices | Approximate |
| Shape with a hole | `polygon()` with `evenodd` or SVG path | Compound bodies do not inherently model collision holes | Not directly equivalent |
| SVG curves | `path()` | Sampled vertices | Approximate |

Matter.js provides `Bodies.rectangle()`, `Bodies.circle()`, `Bodies.polygon()`, and `Bodies.fromVertices()` for creating bodies. The last is the most useful for your conversion functions. matter-js 0.20.0

+1

## 2. CSS polygon → Matter.js body

Your shape:

css
```
clip-path: polygon(
  50% 0%,
  83% 12%,
  100% 43%,
  94% 78%,
  68% 100%,
  32% 100%,
  6% 78%,
  0% 43%,
  17% 12%
);
```

We can parse the polygon, convert percentages into coordinates, center the coordinates around `(x, y)`, and pass them to Matter.js.

The following implementation supports percentage-based `polygon()` values, including concave polygons if you configure the decomposition dependency described below.

javascript
```

function cssPolygonToMatter(
  Matter,
  clipPath,
  width,
  height,
  x,
  y,
  options = {}
) {
  const match = clipPath.match(
    /polygon\(\s*(.*?)\s*\)/i
  );

  if (!match) {
    throw new Error("Expected clip-path: polygon(...)");
  }

  const points = match[1].split(",").map((point) => {
    const values = point.trim().split(/\s+/);

    if (values.length !== 2) {
      throw new Error(`Invalid polygon point: ${point}`);
    }

    function toPixels(value, size) {
      if (value.endsWith("%")) {
        return (parseFloat(value) / 100) * size;
      }

      if (value.endsWith("px")) {
        return parseFloat(value);
      }

      throw new Error(
        `Unsupported coordinate: ${value}. Use % or px.`
      );
    }

    return {
      x: toPixels(values[0], width) - width / 2,
      y: toPixels(values[1], height) - height / 2
    };
  });

  if (points.length < 3) {
    throw new Error("A polygon needs at least 3 points");
  }

  const body = Matter.Bodies.fromVertices(
    x,
    y,
    [points],
    options
  );

  // Preserve the original outline for lossless
  // geometry export later.
  body.plugin = body.plugin || {};
  body.plugin.cssPolygon = {
    points: points.map((p) => ({ ...p })),
    width,
    height
  };

  return body;
}
```

### Example usage

javascript
```
const clipPath = `polygon(
  50% 0%, 83% 12%, 100% 43%,
  94% 78%, 68% 100%, 32% 100%,
  6% 78%, 0% 43%, 17% 12%
)`;

const body = cssPolygonToMatter(
  Matter,
  clipPath,
  200,  // CSS element width
  200,  // CSS element height
  400,  // Matter world x
  300   // Matter world y
);

Matter.Composite.add(engine.world, body);
```

Important: Your particular shape appears convex, so it can be represented by a single Matter.js polygon body. If a polygon is concave, `Bodies.fromVertices()` needs the `poly-decomp` library for proper decomposition; otherwise, Matter.js can fall back to its convex hull, changing the shape. matter-js 0.20.0

+1

## 3. Matter.js body → CSS `clip-path`

For a convex polygon body, you can convert its current vertices back into percentages.

There are two approaches:

- Export the original shape: use the metadata stored when creating the body. This preserves the original points and dimensions, but doesn't reflect subsequent physics movement or rotation.
- Export the current shape: use `body.vertices`, which reflect its current world-space geometry. This is appropriate for synchronizing a CSS element with the physics simulation.

Here is the second approach.

javascript
```

function matterToCssPolygon(body, width, height) {
  const vertices = body.vertices;

  // body.vertices are in world coordinates.
  // Find the element's top-left corner using the
  // body's current bounding box.
  const bounds = body.bounds;
  const left = bounds.min.x;
  const top = bounds.min.y;
  const actualWidth = bounds.max.x - left;
  const actualHeight = bounds.max.y - top;

  if (actualWidth === 0 || actualHeight === 0) {
    throw new Error("Body has zero width or height");
  }

  return `polygon(${vertices.map((v) => {
    const px = ((v.x - left) / actualWidth) * 100;
    const py = ((v.y - top) / actualHeight) * 100;

    return `${px.toFixed(4)}% ${py.toFixed(4)}%`;
  }).join(", ")})`;
}
```

Example:

javascript
```
const clipPath = matterToCssPolygon(body);

element.style.clipPath = clipPath;
```

This code generates a polygon normalized to the body's current axis-aligned bounding box. For the CSS element to line up with the body, its position and size must also match `body.bounds`:

javascript
```
function syncElementToMatter(element, body) {
  const { min, max } = body.bounds;

  element.style.position = "absolute";
  element.style.left = `${min.x}px`;
  element.style.top = `${min.y}px`;
  element.style.width = `${max.x - min.x}px`;
  element.style.height = `${max.y - min.y}px`;

  element.style.clipPath = matterToCssPolygon(body);
}
```

Call this during your render loop. Because the CSS polygon uses the bounding box as its coordinate system, it will track the body as it moves and rotates.

## 4\. What about concave shapes?

This is the biggest issue with bidirectional conversion.

Suppose you have an arrow or a star-shaped polygon with inward notches. CSS can describe the outline as one polygon, but Matter.js may represent the collision geometry using several convex parts.

- CSS → Matter.js: decompose the polygon into convex parts.
- Matter.js → CSS: `body.vertices` represents the parent body's convex hull, not necessarily the original concave outline.
- To preserve the original outline, store the original vertices as metadata, as in the first function.
- To export the actual current concave outline after the body moves or rotates, transform the original outline using the body's position and angle. Alternatively, maintain an outline representation alongside the physics body.

Matter.js documents this convex-hull and decomposition behavior in [`Bodies.fromVertices()`](<https://brm.io/matter-js/docs/classes/Bodies.html>)[https://brm.io/matter-js/docs/classes/Bo...](<https://brm.io/matter-js/docs/classes/Bodies.html>)

 and [`Body.setParts()`](<https://brm.io/matter-js/docs/classes/Body.html>). matter-js 0.20.0

+1

## 5\. A better architecture for a real project

If you want to support many shape types, I recommend using a geometry format independent of both CSS and Matter.js:

javascript
```
const shape = {
  width: 200,
  height: 200,
  points: [
    [0.50, 0.00],
    [0.83, 0.12],
    [1.00, 0.43],
    [0.94, 0.78],
    [0.68, 1.00],
    [0.32, 1.00],
    [0.06, 0.78],
    [0.00, 0.43],
    [0.17, 0.12]
  ]
};
```

The coordinates are normalized to the range `0–1`. From this single representation, you can build:

- `toCssPolygon(shape)` — convert normalized coordinates to percentages.
- `toMatterBody(shape, x, y)` — convert normalized coordinates to Matter.js vertices.
- `fromMatterBody(body, width, height)` — extract a polygon for export, with special handling for compound bodies.
- `toSvgPath(shape)` — render or export the same geometry as SVG.

This avoids using CSS strings as your main data model and makes it easier to serialize, edit, scale, or reuse shapes.

One final detail: the CSS polygon and Matter.js body describe geometry, not necessarily the same visual object. If the Matter.js body rotates, its world-space vertices change; to keep the CSS clipping aligned, you must update the element's position, dimensions, and polygon during rendering.

--------



const camera = {
  following: true,

  deadZone: {
    left: 200,
    right: 200,
    top: 150,
    bottom: 150
  }
};


function updateCamera(target) {
  if (!camera.following) return;

  const { scrollLeft, scrollTop } = viewport;
  const { clientWidth, clientHeight } = viewport;

  const left   = scrollLeft + camera.deadZone.left;
  const right  = scrollLeft + clientWidth - camera.deadZone.right;
  const top    = scrollTop + camera.deadZone.top;
  const bottom = scrollTop + clientHeight - camera.deadZone.bottom;

  let x = scrollLeft;
  let y = scrollTop;

  if (target.x < left) {
    x = target.x - camera.deadZone.left;
  } else if (target.x + target.width > right) {
    x = target.x + target.width
      - clientWidth
      + camera.deadZone.right;
  }

  if (target.y < top) {
    y = target.y - camera.deadZone.top;
  } else if (target.y + target.height > bottom) {
    y = target.y + target.height
      - clientHeight
      + camera.deadZone.bottom;
  }

  viewport.scrollLeft = x;
  viewport.scrollTop = y;
}


camera.following = false;
camera.following = true;


















----------------------------------------------------------






<div class="viewport">
  <div class="world">
    <div class="matter-object"></div>
    <div class="matter-object"></div>
    ...
  </div>
</div>
.viewport {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

.world {
  position: relative;
  width: 5000px;
  height: 5000px;
}

.matter-object {
  position: absolute;
}

+-----------------------------------------+
|                                         |
|       +-----------------------+         |
|       |                       |         |
|       |       DEAD ZONE       |         |
|       |                       |         |
|       +-----------------------+         |
|                                         |
+-----------------------------------------

viewport.scrollLeft
viewport.scrollTop

or

viewport
  └── world
       ├── object
       ├── object
       └── object

camera = { x, y, zoom }
world.transform = camera transform
?


class DOMCamera {
  constructor(viewport) {
    this.viewport = viewport;

    this.deadZone = {
      left: 250,
      right: 250,
      top: 150,
      bottom: 150
    };

    this.lerpX = 0.1;
    this.lerpY = 0.1;

    this.target = null;
  }

  follow(body, width = 0, height = 0) {
    this.target = {
      body,
      width,
      height
    };
  }

  update() {
    if (!this.target) return;

    const {
      body,
      width,
      height
    } = this.target;

    const x = body.position.x - width / 2;
    const y = body.position.y - height / 2;

    this.followRect({
      x,
      y,
      width,
      height
    });
  }

  followRect(target) {
    const viewport = this.viewport;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    let cameraX = viewport.scrollLeft;
    let cameraY = viewport.scrollTop;

    const left = cameraX + this.deadZone.left;
    const right = cameraX + vw - this.deadZone.right;

    const top = cameraY + this.deadZone.top;
    const bottom = cameraY + vh - this.deadZone.bottom;

    let desiredX = cameraX;
    let desiredY = cameraY;

    if (target.x < left) {
      desiredX = target.x - this.deadZone.left;
    } else if (target.x + target.width > right) {
      desiredX =
        target.x + target.width -
        vw +
        this.deadZone.right;
    }

    if (target.y < top) {
      desiredY = target.y - this.deadZone.top;
    } else if (target.y + target.height > bottom) {
      desiredY =
        target.y + target.height -
        vh +
        this.deadZone.bottom;
    }

    viewport.scrollLeft +=
      (desiredX - cameraX) * this.lerpX;

    viewport.scrollTop +=
      (desiredY - cameraY) * this.lerpY;
  }
}

camera.follow(playerBody);

camera.deadZone = {
  left: 300,
  right: 300,
  top: 200,
  bottom: 200
};

camera.lerpX = 0.1;
camera.lerpY = 0.1;

function tick() {
  Matter.Engine.update(engine);

  renderBodies();

  camera.update();

  requestAnimationFrame(tick);
}


------------

class DOMCamera {
  constructor(viewport) {
    this.viewport = viewport;

    this.deadZone = {
      left: 150,
      right: 150,
      top: 100,
      bottom: 100
    };

    this.lerpX = 1;
    this.lerpY = 1;

    this.target = null;
  }

  follow(target) {
    this.target = target;
  }

  update() {
    if (!this.target) return;

    const viewport = this.viewport;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    const cameraX = viewport.scrollLeft;
    const cameraY = viewport.scrollTop;

    const targetLeft = this.target.x;
    const targetTop = this.target.y;
    const targetRight = targetLeft + this.target.width;
    const targetBottom = targetTop + this.target.height;

    const left = cameraX + this.deadZone.left;
    const right = cameraX + vw - this.deadZone.right;

    const top = cameraY + this.deadZone.top;
    const bottom = cameraY + vh - this.deadZone.bottom;

    let desiredX = cameraX;
    let desiredY = cameraY;

    if (targetLeft < left) {
      desiredX = targetLeft - this.deadZone.left;
    } else if (targetRight > right) {
      desiredX = targetRight - vw + this.deadZone.right;
    }

    if (targetTop < top) {
      desiredY = targetTop - this.deadZone.top;
    } else if (targetBottom > bottom) {
      desiredY = targetBottom - vh + this.deadZone.bottom;
    }

    viewport.scrollLeft +=
      (desiredX - viewport.scrollLeft) * this.lerpX;

    viewport.scrollTop +=
      (desiredY - viewport.scrollTop) * this.lerpY;
  }
}

const camera = new DOMCamera(viewport);

camera.deadZone = {
  left: 250,
  right: 250,
  top: 150,
  bottom: 150
};

camera.lerpX = 0.1;
camera.lerpY = 0.1;

camera.follow({
  get x() {
    return body.position.x - 25;
  },
  get y() {
    return body.position.y - 25;
  },
  width: 50,
  height: 50
});


function render() {
  updateMatterObjects();

  camera.update();

  requestAnimationFrame(render);
}




---------------------------------------------------------------


const deadZone = {
  left: 200,
  right: 200,
  top: 150,
  bottom: 150
};

function followObject(viewport, object, deadZone) {
  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;

  const cameraLeft = viewport.scrollLeft;
  const cameraTop = viewport.scrollTop;

  const objectLeft = object.x;
  const objectTop = object.y;

  const objectRight = object.x + object.width;
  const objectBottom = object.y + object.height;

  const deadLeft =
    cameraLeft + deadZone.left;

  const deadRight =
    cameraLeft + viewportWidth - deadZone.right;

  const deadTop =
    cameraTop + deadZone.top;

  const deadBottom =
    cameraTop + viewportHeight - deadZone.bottom;

  let newScrollLeft = cameraLeft;
  let newScrollTop = cameraTop;

  if (objectLeft < deadLeft) {
    newScrollLeft -= deadLeft - objectLeft;
  }

  if (objectRight > deadRight) {
    newScrollLeft += objectRight - deadRight;
  }

  if (objectTop < deadTop) {
    newScrollTop -= deadTop - objectTop;
  }

  if (objectBottom > deadBottom) {
    newScrollTop += objectBottom - deadBottom;
  }

  viewport.scrollLeft = newScrollLeft;
  viewport.scrollTop = newScrollTop;
}

function render() {
  // Matter -> DOM
  object.style.left = `${body.position.x}px`;
  object.style.top = `${body.position.y}px`;

  // DOM -> camera
  followObject(
    viewport,
    {
      x: body.position.x - objectWidth / 2,
      y: body.position.y - objectHeight / 2,
      width: objectWidth,
      height: objectHeight
    },
    deadZone
  );
}

camera.startFollow(player);
camera.setDeadzone(400, 300);

