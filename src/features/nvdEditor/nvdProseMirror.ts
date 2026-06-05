import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export function getProseMirrorPositionsForTextOffsets(
  doc: ProseMirrorNode,
  requestedOffsets: readonly number[],
) {
  const positions: number[] = [];
  let blockPosition = 0;
  let blockTextStart = 0;
  let blockIndex = 0;

  for (const requestedOffset of requestedOffsets) {
    const offset = Math.max(0, requestedOffset);

    while (blockIndex < doc.childCount) {
      const block = doc.child(blockIndex);
      const blockTextLength = getProseMirrorNodeTextLength(block);
      const blockTextEnd = blockTextStart + blockTextLength;

      if (offset <= blockTextEnd) {
        positions.push(
          getInlinePositionForTextOffset(block, blockPosition + 1, offset - blockTextStart),
        );
        break;
      }

      blockTextStart = blockTextEnd + (blockIndex < doc.childCount - 1 ? 1 : 0);
      blockPosition += block.nodeSize;
      blockIndex += 1;
    }

    if (blockIndex >= doc.childCount) {
      positions.push(doc.content.size);
    }
  }

  return positions;
}

function getInlinePositionForTextOffset(
  block: ProseMirrorNode,
  contentStartPosition: number,
  requestedOffset: number,
) {
  let remainingOffset = Math.max(0, requestedOffset);
  let childPosition = contentStartPosition;

  for (let index = 0; index < block.childCount; index += 1) {
    const child = block.child(index);
    const childTextLength = getProseMirrorNodeTextLength(child);

    if (remainingOffset <= childTextLength) {
      return child.isText
        ? childPosition + remainingOffset
        : childPosition + Math.min(remainingOffset, child.nodeSize);
    }

    remainingOffset -= childTextLength;
    childPosition += child.nodeSize;
  }

  return contentStartPosition + block.content.size;
}

function getProseMirrorNodeTextLength(node: ProseMirrorNode) {
  if (node.isText) {
    return node.text?.length ?? 0;
  }

  if (node.type.name === "hardBreak") {
    return 1;
  }

  let textLength = 0;

  for (let index = 0; index < node.childCount; index += 1) {
    textLength += getProseMirrorNodeTextLength(node.child(index));
  }

  return textLength;
}
