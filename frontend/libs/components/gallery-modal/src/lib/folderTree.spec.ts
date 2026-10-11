import { getFolderPath, getRootFolderId } from "./folderTree";

describe("folder ancestry", () => {
  const folders = [
    { id: "root", name: "Root", parentId: null },
    { id: "child", name: "Child", parentId: "root" },
    { id: "leaf", name: "Leaf", parentId: "child" },
  ];

  it("returns the root and ordered breadcrumbs for a nested folder", () => {
    expect(getRootFolderId(folders, "leaf")).toBe("root");
    expect(getFolderPath(folders, "leaf")).toEqual([
      { id: "root", name: "Root" },
      { id: "child", name: "Child" },
      { id: "leaf", name: "Leaf" },
    ]);
  });

  it("terminates for missing ancestors and cycles without repeating breadcrumbs", () => {
    expect(getRootFolderId(folders, "missing")).toBeNull();
    expect(getFolderPath(folders, null)).toEqual([]);
    const cycle = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];
    expect(getRootFolderId(cycle, "a")).toBe("a");
    expect(getFolderPath(cycle, "a").map((folder) => folder.id)).toEqual([
      "b",
      "a",
    ]);
    expect(
      getFolderPath([{ id: "a", name: "A", parentId: "absent" }], "a"),
    ).toEqual([{ id: "a", name: "A" }]);
  });
});
