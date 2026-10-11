import { afterEach, expect, it } from "vitest";
import {
  getCaretOffset,
  getNodeStartOffset,
  serializeEditor,
  setCaretOffset,
} from "./mentionDom";

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

it("serializes chips and line breaks in the same coordinate space as the caret", () => {
  const editor = document.createElement("div");
  editor.innerHTML =
    'Hi <span data-mention="@Ada" contenteditable="false"><img alt="">Ada</span><br><b>next</b>';
  document.body.append(editor);
  expect(serializeEditor(editor)).toBe("Hi @Ada\nnext");
  expect(getNodeStartOffset(editor, editor.querySelector("span")!)).toBe(3);
  for (const offset of [0, 2, 3, 7, 8, 10, 12]) {
    setCaretOffset(editor, offset);
    expect(getCaretOffset(editor)).toBe(offset);
  }
});

it("keeps a restored selection out of an atomic chip", () => {
  const editor = document.createElement("div");
  editor.innerHTML =
    'Hi <span data-mention="@Ada" contenteditable="false">Ada</span>!';
  document.body.append(editor);
  setCaretOffset(editor, 5);
  expect(getCaretOffset(editor)).toBe(7);
  expect(
    editor.querySelector("span")!.contains(window.getSelection()!.anchorNode),
  ).toBe(false);
});
