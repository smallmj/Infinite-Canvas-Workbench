import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { test } from "node:test";

import { buildContext } from "../src/bindings.js";
import { mediaPixelSize } from "../src/media-size.js";
import { runWorkflow } from "../src/runner.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const registry = JSON.parse(fs.readFileSync(path.join(root, "workflows", "registry.json"), "utf8"));
const entry = registry.workflows.find((item) => item.id === "image-remove-bg");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, payload) {
  const body = Buffer.concat([Buffer.from(type, "latin1"), payload]);
  return Buffer.concat([Buffer.from([payload.length >> 24 & 0xff, payload.length >> 16 & 0xff, payload.length >> 8 & 0xff, payload.length & 0xff]), body, Buffer.from([crc32(body) >> 24 & 0xff, crc32(body) >> 16 & 0xff, crc32(body) >> 8 & 0xff, crc32(body) & 0xff])]);
}

/** 生成一张 RGBA PNG，用来验证上传尺寸守卫真的能读到 4 通道图。 */
function rgbaPng(width, height) {
  const raw = [];
  for (let y = 0; y < height; y += 1) {
    raw.push(Buffer.from([0]));
    for (let x = 0; x < width; x += 1) raw.push(Buffer.from([10, 20, 30, x === 0 ? 0 : 255]));
  }
  const ihdr = Buffer.from([width >> 24 & 0xff, width >> 16 & 0xff, width >> 8 & 0xff, width & 0xff, height >> 24 & 0xff, height >> 16 & 0xff, height >> 8 & 0xff, height & 0xff, 8, 6, 0, 0, 0]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(raw))), chunk("IEND", Buffer.alloc(0))]);
}

test("去背景工作流在 registry 里是可见的 cutout 类别，并绑定输入图", () => {
  assert.ok(entry, "image-remove-bg registry entry is missing");
  assert.equal(entry.category, "cutout");
  assert.notEqual(entry.hidden, true, "工作流必须留在 /api/workflows 里，不能靠 hidden 藏掉");
  assert.equal(entry.type, "image");
  assert.equal(entry.bindings.image.node, "1");
  assert.equal(entry.bindings.image.required, true);
  assert.equal(entry.bindings.bg_removal.default, "birefnet.safetensors");
});

test("去背景工作流把 BiRefNet 的 mask 接进 alpha 合成，再交给 SaveImage", () => {
  const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", entry.file), "utf8"));
  assert.equal(workflow["1"].class_type, "LoadImage");
  assert.equal(workflow["2"].class_type, "LoadBackgroundRemovalModel");
  assert.equal(workflow["3"].class_type, "RemoveBackground");
  assert.deepEqual(workflow["3"].inputs.image, ["1", 0]);
  assert.deepEqual(workflow["3"].inputs.bg_removal_model, ["2", 0]);
  // ComfyUI 的 RemoveBackground 输出的是"背景=1"的 mask，必须先反转，否则主体会变成透明。
  assert.equal(workflow["4"].class_type, "InvertMask");
  assert.deepEqual(workflow["4"].inputs.mask, ["3", 0]);
  assert.equal(workflow["5"].class_type, "JoinImageWithAlpha");
  assert.deepEqual(workflow["5"].inputs.image, ["1", 0], "alpha 要贴回原图，不能贴回去过背景的图");
  assert.deepEqual(workflow["5"].inputs.alpha, ["4", 0]);
  assert.equal(workflow["6"].class_type, "SaveImage");
  assert.deepEqual(workflow["6"].inputs.images, ["5", 0]);
  for (const [id, node] of Object.entries(workflow)) {
    for (const value of Object.values(node.inputs || {})) {
      if (Array.isArray(value)) assert.ok(workflow[value[0]], `节点 ${id} 引用了不存在的节点 ${value[0]}`);
    }
  }
});

test("去背景请求把上传图绑到 LoadImage，并把 BiRefNet 权重写进模型节点", async () => {
  const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", entry.file), "utf8"));
  let submitted = null;
  const comfy = {
    submit: async (payload) => {
      submitted = payload;
      return { promptId: "cutout" };
    },
    history: async () => ({ status: { status_str: "success" }, outputs: { 5: { images: [{ filename: "cutout_0001.png", subfolder: "", type: "output" }] } } }),
    view: async () => ({ buffer: rgbaPng(64, 96), contentType: "image/png" }),
  };
  const result = await runWorkflow({
    entry: { ...entry, workflow },
    context: buildContext({ count: 1, images: [{ name: "src.png" }], uploadedImages: [{ name: "uploaded-src.png", subfolder: "" }], params: {} }),
    comfy,
    timeoutMs: 5000,
    pollIntervalMs: 10,
  });
  assert.equal(submitted["1"].inputs.image, "uploaded-src.png");
  assert.equal(submitted["2"].inputs.bg_removal_name, "birefnet.safetensors");
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].filename, "cutout_0001.png");
});

test("上传尺寸守卫能读到 RGBA PNG 的宽高（长边上限 4096 靠它判断）", () => {
  const png = rgbaPng(300, 420);
  const size = mediaPixelSize(png, "image/png", "src.png");
  assert.deepEqual(size, { width: 300, height: 420 });
});
