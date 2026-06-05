import type { NvvDocument, NvvPath } from "../inventoryProject";

export function getNvvDocumentSvg(document: NvvDocument) {
  const width = formatSvgNumber(document.canvasWidth);
  const height = formatSvgNumber(document.canvasHeight);
  const paths = (document.paths ?? [])
    .map((path) => {
      const pathData = getNvvPathData(path);
      if (!pathData) {
        return null;
      }

      return `  <path d="${escapeSvgAttribute(pathData)}" fill="none" stroke="${escapeSvgAttribute(path.stroke)}" stroke-width="${formatSvgNumber(path.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .filter((path): path is string => Boolean(path));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...paths,
    "</svg>",
  ].join("\n");
}

export function getNvvPathData(path: NvvPath) {
  const [firstAnchor, ...anchors] = path.anchors;
  if (!firstAnchor) {
    return "";
  }

  const commands = [`M ${formatSvgNumber(firstAnchor.x)} ${formatSvgNumber(firstAnchor.y)}`];
  let previousAnchor = firstAnchor;

  for (const anchor of anchors) {
    const controlA = previousAnchor.handleOut ?? previousAnchor;
    const controlB = anchor.handleIn ?? anchor;
    commands.push(
      `C ${formatSvgNumber(controlA.x)} ${formatSvgNumber(controlA.y)} ${formatSvgNumber(controlB.x)} ${formatSvgNumber(controlB.y)} ${formatSvgNumber(anchor.x)} ${formatSvgNumber(anchor.y)}`,
    );
    previousAnchor = anchor;
  }

  if (path.closed) {
    const closeAnchorIndex = getClosedAnchorIndex(path);
    const closeAnchor = path.anchors[closeAnchorIndex] ?? firstAnchor;
    const controlA = previousAnchor.handleOut ?? previousAnchor;
    const controlB = closeAnchor.handleIn ?? closeAnchor;
    commands.push(
      `C ${formatSvgNumber(controlA.x)} ${formatSvgNumber(controlA.y)} ${formatSvgNumber(controlB.x)} ${formatSvgNumber(controlB.y)} ${formatSvgNumber(closeAnchor.x)} ${formatSvgNumber(closeAnchor.y)}`,
    );

    if (closeAnchorIndex === 0) {
      commands.push("Z");
    }
  }

  return commands.join(" ");
}

function formatSvgNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return Number(normalized.toFixed(3)).toString();
}

function escapeSvgAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getClosedAnchorIndex(path: NvvPath) {
  const closeAnchorIndex = path.closedToAnchorIndex ?? 0;
  return Number.isInteger(closeAnchorIndex) && closeAnchorIndex >= 0 && closeAnchorIndex < path.anchors.length ? closeAnchorIndex : 0;
}
