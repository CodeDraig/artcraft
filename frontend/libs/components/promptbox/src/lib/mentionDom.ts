import type { MentionItem } from "./MentionItem";

function isChip(node: Node): node is HTMLElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    !!(node as HTMLElement).dataset?.mention
  );
}

/**
 * Mention types that render as atomic thumbnail chips (vs colored text).
 * Video/audio refs stay as text: audio has no thumbnail, and a video frame
 * shrunk to chip size is unreadable.
 */
export function rendersAsChip(item: MentionItem): boolean {
  return item.type === "character" || item.type === "image";
}

/** Nearest chip element enclosing `node` (up to `root`), or null. */
export function chipContaining(
  root: HTMLElement,
  node: Node | null,
): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (isChip(current)) return current;
    current = current.parentNode;
  }
  return null;
}

/**
 * DOM -> plain text. Mention chips contribute their full label ("@Name"),
 * <br> contributes "\n". This replaces `el.innerText` everywhere: with chips
 * in the tree, innerText would return the chip's visible name without the
 * "@" and drift from the plain-text value.
 */
export function serializeEditor(root: Node): string {
  let out = "";
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? "";
      } else if (child.nodeName === "BR") {
        out += "\n";
      } else if (isChip(child)) {
        out += child.dataset.mention ?? "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(root);
  return out;
}

/** Plain-text length a node contributes (chips = label length, BR = 1). */
function nodeLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;
  if (node.nodeName === "BR") return 1;
  if (isChip(node)) return node.dataset.mention?.length ?? 0;
  let len = 0;
  for (const child of Array.from(node.childNodes)) len += nodeLength(child);
  return len;
}

/** Plain-text offset at which `target` (e.g. a chip element) starts. */
export function getNodeStartOffset(root: Node, target: Node): number {
  let offset = 0;
  const walk = (node: Node): boolean => {
    for (const child of Array.from(node.childNodes)) {
      if (child === target) return true;
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        !isChip(child) &&
        child.contains(target)
      ) {
        return walk(child);
      }
      offset += nodeLength(child);
    }
    return false;
  };
  walk(root);
  return offset;
}

// ---------------------------------------------------------------------------
// Cursor helpers for contentEditable
// ---------------------------------------------------------------------------

export function getCaretOffset(el: HTMLElement): number {
  try {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !sel.anchorNode || !el.contains(sel.anchorNode)) {
      return 0;
    }

    const anchorNode = sel.anchorNode;
    const anchorOffset = sel.anchorOffset;
    let offset = 0;

    if (anchorNode === el) {
      for (let i = 0; i < anchorOffset; i++) {
        const child = el.childNodes[i];
        if (!child) break;
        offset += nodeLength(child);
      }
      return offset;
    }

    function countBefore(parent: Node): boolean {
      for (const child of Array.from(parent.childNodes)) {
        if (child === anchorNode) {
          if (child.nodeType === Node.TEXT_NODE) {
            offset += anchorOffset;
          }
          return true;
        }
        if (isChip(child)) {
          // A selection boundary inside an atomic chip counts as after it.
          if (child.contains(anchorNode)) {
            offset += nodeLength(child);
            return true;
          }
          offset += nodeLength(child);
          continue;
        }
        if (child.contains(anchorNode)) {
          return countBefore(child);
        }
        offset += nodeLength(child);
      }
      return false;
    }

    countBefore(el);
    return offset;
  } catch (e) {
    console.debug("getCaretOffset: DOM/selection changed during read", e);
    return 0;
  }
}

export function setCaretOffset(el: HTMLElement, offset: number) {
  try {
    let remaining = offset;

    function placeAt(node: Node, nodeOffset: number): void {
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(node, nodeOffset);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    function findPosition(parent: Node): boolean {
      for (let i = 0; i < parent.childNodes.length; i++) {
        const child = parent.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE) {
          const len = child.textContent?.length ?? 0;
          if (remaining <= len) {
            placeAt(child, remaining);
            return true;
          }
          remaining -= len;
        } else if (child.nodeName === "BR") {
          if (remaining === 0) {
            placeAt(parent, i);
            return true;
          }
          remaining -= 1;
        } else if (isChip(child)) {
          // Atomic: land before the chip at 0, snap after it otherwise —
          // the caret must never end up inside the chip.
          const len = nodeLength(child);
          if (remaining <= 0) {
            placeAt(parent, i);
            return true;
          }
          if (remaining < len) {
            placeAt(parent, i + 1);
            return true;
          }
          remaining -= len;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (findPosition(child)) {
            return true;
          }
        }
      }
      return false;
    }

    if (!findPosition(el)) {
      const sel = window.getSelection();
      if (sel) {
        sel.selectAllChildren(el);
        sel.collapseToEnd();
      }
    }
  } catch (e) {
    console.debug("setCaretOffset: DOM changed during caret restore", e);
  }
}

/**
 * Scroll the contentEditable so the caret is visible.
 * Uses a zero-width space span to get a measurable rect on empty lines.
 */
export function scrollCaretIntoView(el: HTMLElement) {
  try {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !el.contains(sel.anchorNode)) return;

    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(false);

    const span = document.createElement("span");
    span.textContent = "\u200B";
    range.insertNode(span);

    const spanRect = span.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (spanRect.bottom > elRect.bottom) {
      el.scrollTop += spanRect.bottom - elRect.bottom;
    } else if (spanRect.top < elRect.top) {
      el.scrollTop -= elRect.top - spanRect.top;
    }

    // Remove temp node and restore caret after it
    const parent = span.parentNode;
    if (parent) {
      const next = span.nextSibling;
      parent.removeChild(span);

      const restored = document.createRange();
      if (next) {
        restored.setStartBefore(next);
      } else if (parent.lastChild) {
        restored.setStartAfter(parent.lastChild);
      } else {
        restored.selectNodeContents(parent);
      }
      restored.collapse(true);
      sel.removeAllRanges();
      sel.addRange(restored);
    }
  } catch (e) {
    console.debug("scrollCaretIntoView: DOM changed during measurement", e);
  }
}
