/**
 * Anchor-Based Tree Layout — Strict Vertical Lines
 *
 * RULES (bắt buộc):
 *  1. Single child → directly below father (same X column)
 *  2. N children → evenly distributed around father's X column,
 *     with the father at the center of the children block
 *  3. All parent-child connections are strictly orthogonal
 *     (vertical stub → horizontal bus → vertical drops)
 *  4. No diagonal or angled lines
 */

export interface TreeNode {
  handle: string;
  displayName: string;
  gender: number;
  generation: number;
  birthYear?: number;
  deathYear?: number;
  isLiving: boolean;
  isPrivacyFiltered: boolean;
  isPatrilineal: boolean;
  families: string[];
  parentFamilies: string[];
  birthOrderLabel?: string;
  chiLabel?: string;
}

export interface TreeFamily {
  handle: string;
  fatherHandle?: string;
  motherHandle?: string;
  children: string[];
}

export interface PositionedNode {
  node: TreeNode;
  x: number;
  y: number;
  generation: number;
}

export interface PositionedCouple {
  familyHandle: string;
  fatherPos?: PositionedNode;
  motherPos?: PositionedNode;
  midX: number;
  y: number;
}

export interface Connection {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: "parent-child" | "couple";
  d?: string; // Optional pre-computed SVG path
}

export interface LayoutResult {
  nodes: PositionedNode[];
  couples: PositionedCouple[];
  connections: Connection[];
  width: number;
  height: number;
  generations: number;
}

// Sizing
export const CARD_W = 210;
export const CARD_H = 92;
export const H_SPACE = 24;
export const V_SPACE = 80;
export const COUPLE_GAP = 8;

// ═══ Internal subtree structure ═══

// Contour: per-depth-level left/right extent from anchor
// contourLeft[d] = leftmost X offset from anchorX at depth d
// contourRight[d] = rightmost X offset from anchorX at depth d
interface Contour {
  left: number[];
  right: number[];
}

interface Subtree {
  families: TreeFamily[];
  patrilineal?: TreeNode;
  spouses: TreeNode[];
  children: ChildItem[];
  width: number; // total pixel width needed for this subtree
  anchorX: number; // patrilineal person card center X from left edge of subtree
  contour: Contour; // per-depth contour for overlap detection
}

interface ChildItem {
  subtree?: Subtree;
  leaf?: TreeNode;
  width: number;
  anchorX: number; // card center X from left edge of this child item
  contour: Contour; // per-depth contour
}

// Compute minimum separation between two contours so they don't overlap
// Returns the minimum distance between the two anchors
function minSeparation(leftContour: Contour, rightContour: Contour): number {
  const maxDepth = Math.min(leftContour.right.length, rightContour.left.length);
  let minSep = 0;
  for (let d = 0; d < maxDepth; d++) {
    // At depth d, left subtree extends to rightContour[d] from its anchor
    // right subtree starts at leftContour[d] from its anchor
    // Separation needed: leftRight - rightLeft + H_SPACE
    const needed = leftContour.right[d] - rightContour.left[d] + H_SPACE;
    minSep = Math.max(minSep, needed);
  }
  // Ensure minimum separation so cards don't touch
  return Math.max(minSep, H_SPACE);
}

// Merge two contours: shift rightContour by offset and produce combined contour
function mergeContours(
  leftContour: Contour,
  rightContour: Contour,
  offset: number,
): Contour {
  const maxDepth = Math.max(leftContour.left.length, rightContour.left.length);
  const merged: Contour = { left: [], right: [] };
  for (let d = 0; d < maxDepth; d++) {
    const ll = d < leftContour.left.length ? leftContour.left[d] : Infinity;
    const rl =
      d < rightContour.left.length ? rightContour.left[d] + offset : Infinity;
    merged.left.push(Math.min(ll, rl));

    const lr = d < leftContour.right.length ? leftContour.right[d] : -Infinity;
    const rr =
      d < rightContour.right.length
        ? rightContour.right[d] + offset
        : -Infinity;
    merged.right.push(Math.max(lr, rr));
  }
  return merged;
}

// ═══ Step 1: Build subtree recursively, compute widths bottom-up ═══

function buildSubtree(
  patri: TreeNode | undefined,
  familyGroup: TreeFamily[],
  personMap: Map<string, TreeNode>,
  familyMap: Map<string, TreeFamily>,
  visited: Set<string>,
): Subtree | null {
  const familiesToProcess = familyGroup.filter((f) => !visited.has(f.handle));
  if (familiesToProcess.length === 0) return null;

  for (const f of familiesToProcess) visited.add(f.handle);

  const spouses: TreeNode[] = [];

  // Identify spouse for each family
  const familiesWithSpouse = familiesToProcess.map((f) => {
    const fNode = f.fatherHandle ? personMap.get(f.fatherHandle) : undefined;
    const mNode = f.motherHandle ? personMap.get(f.motherHandle) : undefined;
    const sp = patri === fNode ? mNode : fNode;
    return { family: f, spouse: sp };
  });

  // Sort families to put oldest wife first
  familiesWithSpouse.sort((a, b) => {
    const yA = a.spouse?.birthYear ?? Infinity;
    const yB = b.spouse?.birthYear ?? Infinity;
    if (yA !== yB) return yA - yB;
    return 0;
  });

  const sortedFamilies = familiesWithSpouse.map((x) => x.family);
  for (const x of familiesWithSpouse) {
    if (x.spouse) spouses.push(x.spouse);
  }

  const children: ChildItem[] = [];

  for (const fam of sortedFamilies) {
    for (const childHandle of fam.children) {
      const child = personMap.get(childHandle);
      if (!child) continue;

      // Find ALL child's own families
      const childFamilies = Array.from(familyMap.values()).filter(
        (f) =>
          !visited.has(f.handle) &&
          (f.fatherHandle === childHandle || f.motherHandle === childHandle),
      );

      if (childFamilies.length > 0) {
        let childPatri: TreeNode | undefined = undefined;
        const firstFam = childFamilies[0];
        const cfNode = firstFam.fatherHandle
          ? personMap.get(firstFam.fatherHandle)
          : undefined;
        const cmNode = firstFam.motherHandle
          ? personMap.get(firstFam.motherHandle)
          : undefined;
        childPatri = cfNode?.isPatrilineal
          ? cfNode
          : cmNode?.isPatrilineal
            ? cmNode
            : cfNode || cmNode;

        const sub = buildSubtree(
          childPatri,
          childFamilies,
          personMap,
          familyMap,
          visited,
        );
        if (sub) {
          children.push({
            subtree: sub,
            width: sub.width,
            anchorX: sub.anchorX,
            contour: sub.contour,
          });
        } else {
          const leafContour: Contour = {
            left: [-CARD_W / 2],
            right: [CARD_W / 2],
          };
          children.push({
            leaf: child,
            width: CARD_W,
            anchorX: CARD_W / 2,
            contour: leafContour,
          });
        }
      } else {
        const leafContour: Contour = {
          left: [-CARD_W / 2],
          right: [CARD_W / 2],
        };
        children.push({
          leaf: child,
          width: CARD_W,
          anchorX: CARD_W / 2,
          contour: leafContour,
        });
      }
    }
  }

  // ── Compute width and anchorX ──
  const spouseCount = spouses.length;
  const coupleWidth = CARD_W + spouseCount * (CARD_W + COUPLE_GAP);
  const halfCard = CARD_W / 2;

  if (children.length === 0) {
    // Leaf family: width = couple width, anchor = patri center
    const coupleRight = halfCard + spouseCount * (CARD_W + COUPLE_GAP);
    const parentContour: Contour = {
      left: [-halfCard],
      right: [coupleRight],
    };
    return {
      families: sortedFamilies,
      patrilineal: patri,
      spouses,
      children,
      width: coupleWidth,
      anchorX: halfCard,
      contour: parentContour,
    };
  }

  if (children.length === 1) {
    // ═══ RULE 1: Single child → parent card center == child card center ═══
    const child = children[0];
    const childAnchor = child.anchorX;

    const coupleRight = halfCard + spouseCount * (CARD_W + COUPLE_GAP);
    const leftExtent = Math.max(halfCard, childAnchor);
    const childRightExtent = child.width - childAnchor;
    const rightExtent = Math.max(coupleRight, childRightExtent);

    // Build contour: parent at depth 0, then child contour shifted down
    const parentContourLeft = -leftExtent;
    const parentContourRight = rightExtent;
    const combinedContour: Contour = {
      left: [Math.min(-halfCard, parentContourLeft)],
      right: [Math.max(coupleRight, parentContourRight)],
    };
    // Add child contour at depth 1+
    for (let d = 0; d < child.contour.left.length; d++) {
      combinedContour.left.push(child.contour.left[d]);
      combinedContour.right.push(child.contour.right[d]);
    }

    return {
      families: sortedFamilies,
      patrilineal: patri,
      spouses,
      children,
      width: leftExtent + rightExtent,
      anchorX: leftExtent,
      contour: combinedContour,
    };
  }

  // ═══ RULE 2: N children → contour-based minimum separation ═══
  // Place children as close as possible using contour overlap detection

  // Start: first child at anchor 0
  const childOffsets: number[] = [0]; // offset of each child's anchor from first child's anchor
  let mergedChildContour: Contour = {
    left: [...children[0].contour.left],
    right: [...children[0].contour.right],
  };

  for (let i = 1; i < children.length; i++) {
    const sep = minSeparation(mergedChildContour, children[i].contour);
    childOffsets.push(sep);
    mergedChildContour = mergeContours(
      mergedChildContour,
      children[i].contour,
      sep,
    );
  }

  const firstAnchor = childOffsets[0];
  const lastAnchor = childOffsets[childOffsets.length - 1];
  const midpointOfAnchors = (firstAnchor + lastAnchor) / 2;

  let blockLeft = Infinity,
    blockRight = -Infinity;
  for (let i = 0; i < children.length; i++) {
    const childLeft = childOffsets[i] - children[i].anchorX;
    const childRight =
      childOffsets[i] + (children[i].width - children[i].anchorX);
    blockLeft = Math.min(blockLeft, childLeft);
    blockRight = Math.max(blockRight, childRight);
  }

  const childrenTotalWidth = blockRight - blockLeft;
  const childAnchors: number[] = childOffsets.map((o) => o - blockLeft);

  const adjustedAnchorX = midpointOfAnchors - blockLeft;
  const leftExtent = Math.max(halfCard, adjustedAnchorX);
  const coupleRight = halfCard + spouseCount * (CARD_W + COUPLE_GAP);
  const childrenRight = childrenTotalWidth - adjustedAnchorX;
  const rightExtent = Math.max(coupleRight, childrenRight);

  // Build combined contour
  const combinedContour: Contour = {
    left: [Math.min(-halfCard, -adjustedAnchorX)],
    right: [Math.max(coupleRight, childrenRight)],
  };
  for (let d = 0; d < mergedChildContour.left.length; d++) {
    combinedContour.left.push(mergedChildContour.left[d] - midpointOfAnchors);
    combinedContour.right.push(mergedChildContour.right[d] - midpointOfAnchors);
  }

  const subtreeResult: Subtree & {
    childOffsets?: number[];
    blockLeft?: number;
  } = {
    families: sortedFamilies,
    patrilineal: patri,
    spouses,
    children,
    width: leftExtent + rightExtent,
    anchorX: leftExtent,
    contour: combinedContour,
  };
  (subtreeResult as any)._childOffsets = childOffsets;
  (subtreeResult as any)._blockLeft = blockLeft;

  return subtreeResult;
}

// ═══ Step 2: Assign positions top-down ═══

function assignPositions(
  subtree: Subtree,
  startX: number,
  generation: number,
  allNodes: PositionedNode[],
  placed: Set<string>,
) {
  const { patrilineal, spouses, children, anchorX } = subtree;
  const y = generation * (CARD_H + V_SPACE);
  const patriCenterX = startX + anchorX;

  // Place patrilineal person
  if (patrilineal && !placed.has(patrilineal.handle)) {
    allNodes.push({
      node: patrilineal,
      x: patriCenterX - CARD_W / 2,
      y,
      generation,
    });
    placed.add(patrilineal.handle);
  }

  // Place spouses sequentially to the right
  let currentSpouseLeft = patriCenterX + CARD_W / 2 + COUPLE_GAP;
  for (const spouse of spouses) {
    if (!placed.has(spouse.handle)) {
      allNodes.push({
        node: spouse,
        x: currentSpouseLeft,
        y,
        generation,
      });
      placed.add(spouse.handle);
    }
    currentSpouseLeft += CARD_W + COUPLE_GAP;
  }

  // Place children
  if (children.length === 0) return;

  if (children.length === 1) {
    // RULE 1: single child → child's anchor aligned at patriCenterX
    const item = children[0];
    const cx = patriCenterX - item.anchorX;
    if (item.subtree) {
      assignPositions(item.subtree, cx, generation + 1, allNodes, placed);
    } else if (item.leaf && !placed.has(item.leaf.handle)) {
      const childY = (generation + 1) * (CARD_H + V_SPACE);
      allNodes.push({
        node: item.leaf,
        x: cx,
        y: childY,
        generation: generation + 1,
      });
      placed.add(item.leaf.handle);
    }
    return;
  }

  // RULE 2: N children → use contour-based offsets if available
  const storedOffsets = (subtree as any)._childOffsets as number[] | undefined;
  const storedBlockLeft = (subtree as any)._blockLeft as number | undefined;

  if (storedOffsets && storedBlockLeft !== undefined) {
    // Use contour-based child offsets for compact placement
    const firstAnchor = storedOffsets[0];
    const lastAnchor = storedOffsets[storedOffsets.length - 1];
    const midpoint = (firstAnchor + lastAnchor) / 2;

    for (let i = 0; i < children.length; i++) {
      const item = children[i];
      // Child's anchor absolute X = patriCenterX - midpoint + storedOffsets[i]
      const childAnchorX = patriCenterX - midpoint + storedOffsets[i];
      const childStartX = childAnchorX - item.anchorX;

      if (item.subtree) {
        assignPositions(
          item.subtree,
          childStartX,
          generation + 1,
          allNodes,
          placed,
        );
      } else if (item.leaf && !placed.has(item.leaf.handle)) {
        const childY = (generation + 1) * (CARD_H + V_SPACE);
        allNodes.push({
          node: item.leaf,
          x: childStartX,
          y: childY,
          generation: generation + 1,
        });
        placed.add(item.leaf.handle);
      }
    }
  } else {
    // Fallback: old spacing method
    const childAnchors: number[] = [];
    let blockOffset = 0;
    for (const item of children) {
      childAnchors.push(blockOffset + item.anchorX);
      blockOffset += item.width + H_SPACE;
    }
    const firstAnchor = childAnchors[0];
    const lastAnchor = childAnchors[childAnchors.length - 1];
    const midpoint = (firstAnchor + lastAnchor) / 2;

    const blockStartX = patriCenterX - midpoint;

    let cx = blockStartX;
    for (const item of children) {
      if (item.subtree) {
        assignPositions(item.subtree, cx, generation + 1, allNodes, placed);
      } else if (item.leaf && !placed.has(item.leaf.handle)) {
        const childY = (generation + 1) * (CARD_H + V_SPACE);
        allNodes.push({
          node: item.leaf,
          x: cx,
          y: childY,
          generation: generation + 1,
        });
        placed.add(item.leaf.handle);
      }
      cx += item.width + H_SPACE;
    }
  }
}

// ═══ Main layout ═══

export function computeLayout(
  people: TreeNode[],
  families: TreeFamily[],
): LayoutResult {
  const personMap = new Map(people.map((p) => [p.handle, p]));
  const familyMap = new Map(families.map((f) => [f.handle, f]));

  const gens = assignGenerations(people, families);

  // Find root families (parents NOT children of any family)
  const childOfAnyFamily = new Set<string>();
  for (const f of families) {
    for (const ch of f.children) childOfAnyFamily.add(ch);
  }
  const rootFamilies = families.filter((f) => {
    const fh = f.fatherHandle ? personMap.get(f.fatherHandle) : null;
    const mh = f.motherHandle ? personMap.get(f.motherHandle) : null;
    return (
      (fh && !childOfAnyFamily.has(fh.handle)) ||
      (mh && !childOfAnyFamily.has(mh.handle))
    );
  });

  // Group families by their patrilineal person
  const getPatri = (fam: TreeFamily) => {
    const father = fam.fatherHandle ? personMap.get(fam.fatherHandle) : null;
    const mother = fam.motherHandle ? personMap.get(fam.motherHandle) : null;
    const patri = father?.isPatrilineal
      ? father
      : mother?.isPatrilineal
        ? mother
        : father || mother;
    return patri;
  };

  const rootFamiliesByPatri = new Map<string, TreeFamily[]>();
  for (const fam of rootFamilies) {
    const patri = getPatri(fam);
    const key = patri ? patri.handle : fam.handle;
    const list = rootFamiliesByPatri.get(key) || [];
    list.push(fam);
    rootFamiliesByPatri.set(key, list);
  }

  const allNodes: PositionedNode[] = [];
  const visited = new Set<string>();
  const placed = new Set<string>();
  let cursorX = 0;

  // Build subtrees for root families
  for (const [patriHandle, famGroup] of rootFamiliesByPatri.entries()) {
    const patri = personMap.get(patriHandle);
    const subtree = buildSubtree(
      patri,
      famGroup,
      personMap,
      familyMap,
      visited,
    );
    if (!subtree) continue;

    const rootGen =
      subtree.patrilineal && subtree.patrilineal.generation > 0
        ? subtree.patrilineal.generation - 1
        : 0;

    assignPositions(subtree, cursorX, rootGen, allNodes, placed);
    cursorX += subtree.width + H_SPACE;
  }

  // Handle "Islands"
  const islandFamiliesByPatri = new Map<string, TreeFamily[]>();
  for (const fam of families) {
    if (visited.has(fam.handle)) continue;
    const patri = getPatri(fam);
    const key = patri ? patri.handle : fam.handle;
    const list = islandFamiliesByPatri.get(key) || [];
    list.push(fam);
    islandFamiliesByPatri.set(key, list);
  }

  for (const [patriHandle, famGroup] of islandFamiliesByPatri.entries()) {
    const patri = personMap.get(patriHandle);
    const subtree = buildSubtree(
      patri,
      famGroup,
      personMap,
      familyMap,
      visited,
    );
    if (!subtree) continue;

    const rootGen =
      subtree.patrilineal && subtree.patrilineal.generation > 0
        ? subtree.patrilineal.generation - 1
        : 0;

    assignPositions(subtree, cursorX, rootGen, allNodes, placed);
    cursorX += subtree.width + H_SPACE;
  }

  // Place orphans (people not in any family tree)
  // Use DB generation field (1-based) converted to 0-based for Y position
  for (const p of people) {
    if (!placed.has(p.handle)) {
      // Prefer DB generation field (1-based → 0-based) if available,
      // fall back to computed gen from tree structure
      const dbGen = p.generation > 0 ? p.generation - 1 : null;
      const gen = dbGen !== null ? dbGen : (gens.get(p.handle) ?? 0);
      allNodes.push({
        node: p,
        x: cursorX,
        y: gen * (CARD_H + V_SPACE),
        generation: gen,
      });
      placed.add(p.handle);
      cursorX += CARD_W + H_SPACE;
    }
  }

  // ═══ Normalize: shift all nodes so min X = 0 ═══
  let minX = Infinity;
  for (const n of allNodes) {
    minX = Math.min(minX, n.x);
  }
  if (minX !== 0 && minX !== Infinity) {
    for (const n of allNodes) {
      n.x -= minX;
    }
  }

  // ═══ Compute strictly orthogonal connections ═══
  const nodeMap = new Map(allNodes.map((n) => [n.node.handle, n]));
  const connections: Connection[] = [];
  const couples: PositionedCouple[] = [];

  // Find spouses of each patrilineal person for line chaining
  const spousesOfPatri = new Map<
    string,
    { spouse: PositionedNode; family: TreeFamily }[]
  >();
  for (const fam of families) {
    const fn = fam.fatherHandle ? nodeMap.get(fam.fatherHandle) : null;
    const mn = fam.motherHandle ? nodeMap.get(fam.motherHandle) : null;
    const pn = fn?.node.isPatrilineal
      ? fn
      : mn?.node.isPatrilineal
        ? mn
        : fn || mn;
    const sp = pn === fn ? mn : fn;
    if (pn && sp) {
      if (!spousesOfPatri.has(pn.node.handle))
        spousesOfPatri.set(pn.node.handle, []);
      spousesOfPatri.get(pn.node.handle)!.push({ spouse: sp, family: fam });
    }
  }

  // Generate chained couple connections
  for (const [patriHandle, spousesItems] of spousesOfPatri.entries()) {
    const patriNode = nodeMap.get(patriHandle);
    if (!patriNode) continue;

    // sort the spouses by X to draw connections continuously left-to-right
    spousesItems.sort((a, b) => a.spouse.x - b.spouse.x);

    let leftNode = patriNode; // Start chain from Patrilineal person
    for (const { spouse, family } of spousesItems) {
      const rightNode = spouse;

      const actualLeft = leftNode.x < rightNode.x ? leftNode : rightNode;
      const actualRight = leftNode.x < rightNode.x ? rightNode : leftNode;

      connections.push({
        fromX: actualLeft.x + CARD_W,
        fromY: actualLeft.y + CARD_H / 2,
        toX: actualRight.x,
        toY: actualRight.y + CARD_H / 2,
        type: "couple",
      });
      couples.push({
        familyHandle: family.handle,
        fatherPos: family.fatherHandle
          ? nodeMap.get(family.fatherHandle)
          : undefined,
        motherPos: family.motherHandle
          ? nodeMap.get(family.motherHandle)
          : undefined,
        midX: (actualLeft.x + CARD_W + actualRight.x) / 2,
        y: actualLeft.y,
      });

      // Next line starts from this spouse
      leftNode = rightNode;
    }
  }

  // Parent-child connections
  for (const fam of families) {
    const fatherNode = fam.fatherHandle
      ? nodeMap.get(fam.fatherHandle)
      : undefined;
    const motherNode = fam.motherHandle
      ? nodeMap.get(fam.motherHandle)
      : undefined;
    if (!fatherNode && !motherNode) continue;

    const patriNode =
      (fatherNode?.node.isPatrilineal ? fatherNode : motherNode) ?? fatherNode;

    if (!patriNode) continue;

    // Safety check for NaN or Infinity
    if (!isFinite(patriNode.x) || !isFinite(patriNode.y)) continue;

    // Parent-child connections: strictly orthogonal bus-line with curved elbows
    if (patriNode && fam.children.length > 0) {
      const parentCX = patriNode.x + CARD_W / 2;
      const parentBottomY = patriNode.y + CARD_H;

      const placedChildren = fam.children
        .map((ch) => nodeMap.get(ch))
        .filter((n): n is PositionedNode => !!n);
      if (placedChildren.length === 0) continue;

      const childTopY = placedChildren[0].y;
      // Bus Y = halfway between parent bottom and child top
      const busY = parentBottomY + (childTopY - parentBottomY) * 0.5;
      const R = 12; // Radius for curved elbows

      if (placedChildren.length === 1) {
        const childCX = placedChildren[0].x + CARD_W / 2;

        if (Math.abs(childCX - parentCX) < 1) {
          // RULE 1: straight vertical line (father and child same column)
          connections.push({
            fromX: parentCX,
            fromY: parentBottomY,
            toX: parentCX,
            toY: childTopY,
            type: "parent-child",
            d: `M${parentCX},${parentBottomY} L${parentCX},${childTopY}`,
          });
        } else {
          // L-shape with curves
          const dx = childCX > parentCX ? 1 : -1;
          connections.push({
            fromX: parentCX,
            fromY: parentBottomY,
            toX: childCX,
            toY: childTopY,
            type: "parent-child",
            d: `M${parentCX},${parentBottomY} 
                  V${busY - R} 
                  Q${parentCX},${busY} ${parentCX + dx * R},${busY} 
                  H${childCX - dx * R} 
                  Q${childCX},${busY} ${childCX},${busY + R} 
                  V${childTopY}`,
          });
        }
      } else {
        // RULE 2: vertical stub → horizontal bus → vertical drops
        const childCenters = placedChildren
          .map((c) => c.x + CARD_W / 2)
          .sort((a, b) => a - b);

        const busLeft = childCenters[0];
        const busRight = childCenters[childCenters.length - 1];

        // 1. Parent stub down to bus height
        connections.push({
          fromX: parentCX,
          fromY: parentBottomY,
          toX: parentCX,
          toY: busY,
          type: "parent-child",
          d: `M${parentCX},${parentBottomY} L${parentCX},${busY}`,
        });

        // 2. Horizontal segments between children points
        // To prevent "overshooting", we only draw the bus between the curve-start points
        // and the parent junction.

        // For each child, draw the drop and its curve to the bus
        for (const child of placedChildren) {
          const cx = child.x + CARD_W / 2;
          const dx = cx > parentCX ? 1 : cx < parentCX ? -1 : 0;

          if (dx === 0) {
            // Direct drop from T-junction
            connections.push({
              fromX: cx,
              fromY: busY,
              toX: cx,
              toY: childTopY,
              type: "parent-child",
              d: `M${cx},${busY} L${cx},${childTopY}`,
            });
          } else {
            // Curved drop from horizontal bus
            connections.push({
              fromX: cx,
              fromY: busY,
              toX: cx,
              toY: childTopY,
              type: "parent-child",
              d: `M${cx - dx * R},${busY} Q${cx},${busY} ${cx},${busY + R} V${childTopY}`,
            });

            // Draw horizontal segment from parent junction to this curve start
            // (Note: this might overlap other horizontal segments if we are not careful,
            // but we'll draw from parentCX to cx - dx*R)
            connections.push({
              fromX: parentCX,
              fromY: busY,
              toX: cx - dx * R,
              toY: busY,
              type: "parent-child",
              d: `M${parentCX},${busY} L${cx - dx * R},${busY}`,
            });
          }
        }
      }
    }
  }

  // Bounds
  let maxX = 0,
    maxY = 0;
  for (const n of allNodes) {
    maxX = Math.max(maxX, n.x + CARD_W);
    maxY = Math.max(maxY, n.y + CARD_H);
  }

  return {
    nodes: allNodes,
    couples,
    connections,
    width: maxX + H_SPACE,
    height: maxY + V_SPACE / 2,
    generations: Math.max(...Array.from(gens.values())) + 1,
  };
}

// ═══ Generation assignment ═══

function assignGenerations(
  people: TreeNode[],
  families: TreeFamily[],
): Map<string, number> {
  const gens = new Map<string, number>();
  const familyMap = new Map(families.map((f) => [f.handle, f]));

  function setGen(handle: string, gen: number) {
    const current = gens.get(handle);
    if (current !== undefined && current <= gen) return;
    gens.set(handle, gen);
    const person = people.find((p) => p.handle === handle);
    if (!person) return;
    for (const famId of person.families) {
      const fam = familyMap.get(famId);
      if (!fam) continue;
      if (fam.fatherHandle && fam.fatherHandle !== handle)
        setGen(fam.fatherHandle, gen);
      if (fam.motherHandle && fam.motherHandle !== handle)
        setGen(fam.motherHandle, gen);
      for (const ch of fam.children) setGen(ch, gen + 1);
    }
  }

  for (const p of people) {
    if (p.parentFamilies.length === 0 && !gens.has(p.handle)) {
      // Use absolute generation from DB as starting point
      const startGen = p.generation > 0 ? p.generation - 1 : 0;
      setGen(p.handle, startGen);
    }
  }
  for (const p of people) {
    if (!gens.has(p.handle)) {
      const startGen = p.generation > 0 ? p.generation - 1 : 0;
      setGen(p.handle, startGen);
    }
  }

  return gens;
}

// ═══ Filter functions ═══

export function filterAncestors(
  handle: string,
  people: TreeNode[],
  families: TreeFamily[],
) {
  const result = new Set<string>();
  const familyMap = new Map(families.map((f) => [f.handle, f]));
  const personMap = new Map(people.map((p) => [p.handle, p]));

  function walk(h: string) {
    if (result.has(h)) return;
    result.add(h);
    const person = personMap.get(h);
    if (!person) return;
    for (const pfId of person.parentFamilies) {
      const fam = familyMap.get(pfId);
      if (fam) {
        if (fam.fatherHandle) walk(fam.fatherHandle);
        if (fam.motherHandle) walk(fam.motherHandle);
      }
    }
  }
  walk(handle);

  return {
    filteredPeople: people.filter((p) => result.has(p.handle)),
    filteredFamilies: families.filter(
      (f) =>
        (f.fatherHandle && result.has(f.fatherHandle)) ||
        (f.motherHandle && result.has(f.motherHandle)),
    ),
  };
}

export function filterDescendants(
  handle: string,
  people: TreeNode[],
  families: TreeFamily[],
) {
  const result = new Set<string>();
  const familyMap = new Map(families.map((f) => [f.handle, f]));
  const personMap = new Map(people.map((p) => [p.handle, p]));
  const includedFamilies = new Set<string>();

  function walk(h: string) {
    if (result.has(h)) return;
    result.add(h);
    const person = personMap.get(h);
    if (!person) return;
    for (const fId of person.families) {
      const fam = familyMap.get(fId);
      if (fam) {
        includedFamilies.add(fam.handle);
        if (fam.fatherHandle) result.add(fam.fatherHandle);
        if (fam.motherHandle) result.add(fam.motherHandle);
        for (const ch of fam.children) walk(ch);
      }
    }
  }
  walk(handle);

  return {
    filteredPeople: people.filter((p) => result.has(p.handle)),
    // Only include families where a PARENT is in the result set (not ancestor families)
    filteredFamilies: families.filter((f) => includedFamilies.has(f.handle)),
  };
}
