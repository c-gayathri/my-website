import { expect, test } from '@playwright/test';
import { GLOBAL_DEFAULTS, componentBBox, generateGlobal, generateLocal, summarize } from '../constellation.js';

test.describe('generation math', () => {
  test('is deterministic and changes with the seed', () => {
    expect(generateGlobal('fixed-seed')).toEqual(generateGlobal('fixed-seed'));
    expect(generateGlobal('fixed-seed')).not.toEqual(generateGlobal('other-seed'));
  });

  test('global forest respects node counts, depth, and degree bounds', () => {
    const model = generateGlobal();
    expect(model.components.length).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.componentCount);
    expect(model.logicalEdges).toHaveLength(model.nodes.length - model.components.length);

    const nodeIds = new Set(model.nodes.map((node) => node.id));
    const childCounts = new Map(model.nodes.map((node) => [node.id, 0]));
    for (const edge of model.logicalEdges) {
      expect(edge.from.startsWith(edge.componentId)).toBeTruthy();
      expect(edge.to.startsWith(edge.componentId)).toBeTruthy();
      expect(nodeIds.has(edge.from)).toBeTruthy();
      expect(nodeIds.has(edge.to)).toBeTruthy();
      const from = model.nodes.find((node) => node.id === edge.from);
      const to = model.nodes.find((node) => node.id === edge.to);
      expect(edge.length).toBeCloseTo(Math.hypot(to.x - from.x, to.y - from.y), 10);
      childCounts.set(edge.from, childCounts.get(edge.from) + 1);
    }

    expect(Math.max(...childCounts.values())).toBeLessThanOrEqual(GLOBAL_DEFAULTS.maxChildrenPerNode);
    expect(Math.max(...model.nodes.map((node) => node.depth))).toBeLessThanOrEqual(GLOBAL_DEFAULTS.maxDepth);

    for (const component of model.components) {
      expect(component.nodeIds.length).toBeGreaterThanOrEqual(1);
      expect(component.nodeIds.length).toBeLessThanOrEqual(GLOBAL_DEFAULTS.nodesPerComponentMax);
      const visited = new Set([component.nodeIds[0]]);
      while (true) {
        const next = model.logicalEdges.find((edge) => edge.componentId === component.id && visited.has(edge.from) && !visited.has(edge.to));
        if (!next) break;
        visited.add(next.to);
      }
      expect(visited.size).toBe(component.nodeIds.length);
    }
  });

  test('visible edges form contiguous short runs per global component', () => {
    for (const component of generateGlobal().components) {
      const visible = component.logicalEdges.filter((edge) => edge.visible);
      const byParent = new Map();
      for (const edge of component.logicalEdges) {
        if (!byParent.has(edge.from)) byParent.set(edge.from, []);
        byParent.get(edge.from).push(edge);
      }
      let runCount = 0;
      for (const edge of visible) {
        if (!visible.some((other) => other.id !== edge.id && other.to === edge.from)) runCount += 1;
      }
      expect(runCount).toBeGreaterThanOrEqual(0);
      expect(runCount).toBeLessThanOrEqual(GLOBAL_DEFAULTS.visibleRunsPerComponentMax);
      for (const edge of visible) {
        const children = byParent.get(edge.to) || [];
        const continuation = children.filter((child) => child.visible);
        expect(continuation.length).toBeLessThanOrEqual(1);
      }
    }
  });

  test('global placement keeps component footprints non-overlapping and dispersed', () => {
    const model = generateGlobal();
    const nodeBox = (componentId) => {
      const component = model.components.find((item) => item.id === componentId);
      const pts = component.nodeIds.map((nodeId) => {
        const node = model.nodes.find((n) => n.id === nodeId);
        return { x: node.x, y: node.y };
      });
      return boundingBoxFor(pts);
    };
    const pack = (box, pad) => ({ x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad });
    const pad = 0.02;
    const boxes = model.components.map((component) => pack(nodeBox(component.id), pad));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const intersects = a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
        expect(intersects).toBe(false);
      }
    }
    const centres = boxes.map((box) => ({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }));
    for (let i = 0; i < centres.length; i += 1) {
      for (let j = i + 1; j < centres.length; j += 1) {
        const delta = Math.hypot(centres[i].x - centres[j].x, centres[i].y - centres[j].y);
        expect(delta).toBeGreaterThan(0.09);
      }
    }
  });

  test('field obeys normalized, anisotropic, and count constraints', () => {
    const model = generateGlobal();
    const allPoints = [...model.nodes, ...model.stars, ...model.ornaments];
    for (const point of allPoints) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
    const nodeSwarms = model.swarms.filter((swarm) => swarm.kind === 'node');
    for (const swarm of nodeSwarms) {
      expect(swarm.ratio).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.anisotropyRatioMin);
      expect(swarm.ratio).toBeLessThanOrEqual(GLOBAL_DEFAULTS.anisotropyRatioMax);
      expect(swarm.major).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.swarmSigmaMajorMin);
      expect(swarm.major).toBeLessThanOrEqual(GLOBAL_DEFAULTS.swarmSigmaMajorMax);
      expect(swarm.minor).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.swarmSigmaMinorMin);
      expect(swarm.minor).toBeLessThanOrEqual(GLOBAL_DEFAULTS.swarmSigmaMinorMax);
      expect(swarm.major / swarm.minor).toBeCloseTo(swarm.ratio, 10);
      expect(swarm.count).toBeGreaterThanOrEqual(4);
      expect(swarm.count).toBeLessThanOrEqual(GLOBAL_DEFAULTS.starsPerSwarmMax);
    }
    const satellites = model.swarms.filter((swarm) => swarm.kind === 'satellite');
    for (const satellite of satellites) {
      const ratio = satellite.major / satellite.minor;
      expect(ratio).toBeGreaterThanOrEqual(1.4);
      expect(ratio).toBeLessThanOrEqual(2.8);
      expect(satellite.count).toBeGreaterThanOrEqual(3);
      expect(satellite.count).toBeLessThanOrEqual(10);
    }
    const ambient = model.swarms.filter((swarm) => swarm.kind === 'ambient');
    expect(ambient.length).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.ambientPocketCountMin);
    expect(ambient.length).toBeLessThanOrEqual(GLOBAL_DEFAULTS.ambientPocketCountMax);
    for (const pocket of ambient) {
      expect(pocket.count).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.ambientPocketStarsMin);
      expect(pocket.count).toBeLessThanOrEqual(GLOBAL_DEFAULTS.ambientPocketStarsMax + 5);
      expect(pocket.major / pocket.minor).toBeGreaterThanOrEqual(1.4);
      expect(pocket.major / pocket.minor).toBeLessThanOrEqual(2.8);
    }
    const summary = summarize(model);
    expect(summary.dots / summary.stars).toBeGreaterThan(0.02);
    expect(summary.stars).toBeGreaterThanOrEqual(150);
    expect(summary.ornaments).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.specialStarCountMin);
    expect(summary.ornaments).toBeLessThanOrEqual(GLOBAL_DEFAULTS.specialStarCountMax);
    expect(model.logicalEdges.every((edge) => !edge.from.startsWith('star-') && !edge.to.startsWith('star-'))).toBeTruthy();
    const endpointStars = model.stars.filter((star) => star.endpoint);
    expect(endpointStars.length).toBeGreaterThan(0);
    expect(endpointStars.every((star) => star.glyph === 'small')).toBeTruthy();
    const backgrounds = model.stars.filter((star) => star.source === 'background');
    expect(backgrounds.length).toBeGreaterThanOrEqual(GLOBAL_DEFAULTS.backgroundStarCountMin);
    expect(backgrounds.length).toBeLessThanOrEqual(GLOBAL_DEFAULTS.backgroundStarCountMax + 36);
    const swarmStars = model.stars.filter((star) => star.source === 'swarm' || star.source === 'satellite');
    const swarmIds = new Set(model.swarms.map((swarm) => swarm.id));
    expect(swarmStars.every((star) => typeof star.swarmId === 'string' && swarmIds.has(star.swarmId))).toBeTruthy();
    // A declutter nudge must never fling a structural star into a neighbouring
    // component's bounding box.
    for (const star of swarmStars) {
      const swarm = model.swarms.find((s) => s.id === star.swarmId);
      expect(swarm).toBeTruthy();
      const owning = model.components.find((c) => c.id === swarm.componentId);
      const box = componentBBox(model, owning.id);
      expect(star.x).toBeGreaterThanOrEqual(box.x0 - 0.06);
      expect(star.x).toBeLessThanOrEqual(box.x1 + 0.06);
      expect(star.y).toBeGreaterThanOrEqual(box.y0 - 0.06);
      expect(star.y).toBeLessThanOrEqual(box.y1 + 0.06);
    }
  });

  test('glyph size ranges and weights follow the spec', () => {
    const tally = {};
    const violations = [];
    for (let i = 0; i < 120; i += 1) {
      const model = generateGlobal(`glyphs-${i}`);
      for (const star of model.stars) {
        tally[star.glyph] = (tally[star.glyph] || 0) + 1;
        const size = star.sizePx;
        if (star.endpoint) continue;
        if (star.glyph === 'tiny' && (size < 2 || size > 3.1)) violations.push(star.glyph);
        if (star.glyph === 'small' && (size < 3 || size > 5.1)) violations.push(star.glyph);
        if (star.glyph === 'medium' && (size < 5 || size > 8.1)) violations.push(star.glyph);
        if (star.glyph === 'bold' && (size < 8 || size > 13.1)) violations.push(star.glyph);
        if (star.glyph === 'cross' && (size < 2 || size > 3.5)) violations.push(star.glyph);
        if (star.glyph === 'dot' && (size < 1.2 || size > 2.1)) violations.push(star.glyph);
      }
    }
    expect(violations).toEqual([]);
    const total = Object.values(tally).reduce((sum, count) => sum + count, 0);
    const share = (name) => (tally[name] || 0) / total;
    expect(share('tiny')).toBeGreaterThan(0.2);
    expect(share('tiny')).toBeLessThan(0.4);
    expect(share('small')).toBeGreaterThan(0.2);
    expect(share('small')).toBeLessThan(0.36);
    expect(share('medium')).toBeGreaterThan(0.08);
    expect(share('medium')).toBeLessThan(0.24);
    expect(share('bold')).toBeGreaterThan(0.01);
    expect(share('bold')).toBeLessThan(0.1);
    expect(share('dot')).toBeGreaterThan(0.16);
  });

  test('edge style distribution converges near the spec dotted probability', () => {
    const totals = { visible: 0, dotted: 0 };
    for (let i = 0; i < 200; i += 1) {
      const model = generateGlobal(`edge-style-${i}`);
      const visible = model.logicalEdges.filter((edge) => edge.visible);
      totals.visible += visible.length;
      totals.dotted += visible.filter((edge) => edge.style === 'dotted').length;
    }
    expect(totals.dotted / totals.visible).toBeGreaterThan(0.36);
    expect(totals.dotted / totals.visible).toBeLessThan(0.54);
  });

  test('local variants honor structure, scale, and occupancy requirements', () => {
    const expected = { big: 1, 'big-plus-one': 2, 'big-plus-two': 3 };
    const demos = { big: 'study-0', 'big-plus-one': 'study-1', 'big-plus-two': 'study-4' };
    for (const [variant, componentCount] of Object.entries(expected)) {
      const model = generateLocal(demos[variant], variant);
      expect(model.components).toHaveLength(componentCount);
      const main = model.components[0];
      expect(main.nodeIds.length).toBeGreaterThanOrEqual(7);
      expect(main.nodeIds.length).toBeLessThanOrEqual(variant === 'big' ? 10 : 9);
      for (const edge of model.logicalEdges) {
        expect(edge.from.startsWith(edge.componentId) && edge.to.startsWith(edge.componentId)).toBeTruthy();
      }
      const mainPocketStars = model.stars.filter((star) => star.componentId === 'main' && star.source === 'swarm');
      expect(mainPocketStars.length).toBeGreaterThanOrEqual(10);
      const satellites = model.layout.satellites;
      if (variant === 'big-plus-one') {
        expect(satellites).toHaveLength(1);
        const sat = satellites[0];
        expect(sat.bbox.w / model.layout.mainBBox.w).toBeGreaterThanOrEqual(0.25);
        expect(sat.bbox.w / model.layout.mainBBox.w).toBeLessThanOrEqual(0.4);
        expect(sat.gap / model.layout.mainBBox.w).toBeGreaterThanOrEqual(0.15);
        expect(sat.gap / model.layout.mainBBox.w).toBeLessThanOrEqual(0.35);
        expect(model.layout.interstitialCount).toBeGreaterThanOrEqual(3);
        expect(model.layout.interstitialCount).toBeLessThanOrEqual(6);
        expect(model.components[1].nodeIds.length).toBeGreaterThanOrEqual(3);
        expect(model.components[1].nodeIds.length).toBeLessThanOrEqual(5);
      }
      if (variant === 'big-plus-two') {
        expect(satellites).toHaveLength(2);
        const [satA, satB] = satellites;
        expect(satA.bbox.w / model.layout.mainBBox.w).toBeGreaterThanOrEqual(0.25);
        expect(satA.bbox.w / model.layout.mainBBox.w).toBeLessThanOrEqual(0.35);
        expect(satB.bbox.w / model.layout.mainBBox.w).toBeGreaterThanOrEqual(0.1);
        expect(satB.bbox.w / model.layout.mainBBox.w).toBeLessThanOrEqual(0.2);
        expect(satB.bbox.w).toBeLessThan(satA.bbox.w);
        const delta = normalizeAngle(satB.angle - satA.angle);
        expect(delta).toBeGreaterThanOrEqual(Math.PI * 70 / 180 - 0.15);
        expect(delta).toBeLessThanOrEqual(Math.PI * 190 / 180 + 0.15);
        expect(model.layout.interstitialCount).toBeGreaterThanOrEqual(4);
        expect(model.layout.interstitialCount).toBeLessThanOrEqual(8);
        expect(model.components[2].nodeIds.length).toBeGreaterThanOrEqual(2);
        expect(model.components[2].nodeIds.length).toBeLessThanOrEqual(3);
      }
      if (variant === 'big') {
        expect(model.layout.mainWidthFraction).toBeGreaterThanOrEqual(0.5);
        expect(model.layout.mainWidthFraction).toBeLessThanOrEqual(0.6);
        expect(model.layout.mainHeightFraction).toBeGreaterThanOrEqual(0.45);
        expect(model.layout.mainHeightFraction).toBeLessThanOrEqual(0.6);
        expect(model.layout.ambientCount).toBeGreaterThanOrEqual(5);
        expect(model.layout.ambientCount).toBeLessThanOrEqual(10);
        expect(model.nodes.length).toBeLessThanOrEqual(10);
      }
      if (variant !== 'big') {
        const mainBox = model.layout.mainBBox;
        const viewWidth = 1000;
        expect(mainBox.w / viewWidth).toBeGreaterThanOrEqual(configRange(variant, 'targetWidth')[0]);
        expect(mainBox.w / viewWidth).toBeLessThanOrEqual(configRange(variant, 'targetWidth')[1]);
      }
      const frag = model.layout.fragBBox;
      expect(frag.w).toBeGreaterThan(0);
      const withinView = new Set([...model.nodes, ...model.stars]);
      for (const point of withinView) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1000);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1000);
      }
    }
  });

  function boundingBoxFor(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }

  function configRange(variant, key) {
    if (key === 'targetWidth') {
      return { big: [0.5, 0.6], 'big-plus-one': [0.42, 0.52], 'big-plus-two': [0.4, 0.5] }[variant];
    }
    return [0, 1];
  }

  function normalizeAngle(angle) {
    let result = angle % (Math.PI * 2);
    if (result < 0) result += Math.PI * 2;
    return result;
  }
});

test.describe('browser rendering', () => {
  test('renders the study with only black marks and no rotation', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => window.constellationReady === true);
    await expect(page.locator('.constellation-svg')).toHaveCount(7);
    await expect(page.locator('#global-field [data-node]')).not.toHaveCount(0);
    const svgStyles = await page.locator('.constellation-svg').first().evaluate((svg) => ({
      color: getComputedStyle(svg).color,
      transforms: [...svg.querySelectorAll('[transform]')].map((node) => node.getAttribute('transform')),
      opacities: [...svg.querySelectorAll('[opacity]')].map((node) => node.getAttribute('opacity')),
    }));
    expect(svgStyles.color).toBe('rgb(0, 0, 0)');
    expect(svgStyles.transforms).toEqual([]);
    expect(svgStyles.opacities).toEqual([]);
    const noRhombus = await page.evaluate(() => {
      const svg = document.querySelector('#global-field svg');
      const paths = [...svg.querySelectorAll('path')];
      return paths.filter((path) => path.getAttribute('d') && /L/.test(path.getAttribute('d'))).length;
    });
    const glyphCount = await page.evaluate(() => {
      const svg = document.querySelector('#global-field svg');
      const viewWidth = svg.viewBox.baseVal.width;
      const marks = [...svg.querySelectorAll('.mark')];
      return { count: marks.reduce((sum, group) => sum + group.children.length, 0), viewWidth };
    });
    expect(glyphCount.count).toBeGreaterThan(150);
    expect(noRhombus).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('captures deterministic desktop and mobile studies', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('/');
    await page.waitForFunction(() => window.constellationReady === true);
    await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForFunction(() => window.constellationReady === true);
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  });
});
