import { afterEach, describe, expect, it, vi } from "vitest";
import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import { http } from "../http";
import { uploadApi } from "./upload";

describe("uploadApi.upload", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends one file with its kind and reports progress as a fraction", async () => {
    const post = vi.spyOn(http, "post").mockResolvedValue({ data: { key: "k", url: "u", thumb_url: null, kind: "equipment" } });
    const onProgress = vi.fn();
    const controller = new AbortController();

    await uploadApi.upload(new Blob(["x"], { type: "image/jpeg" }), "equipment", "drill.jpg", { onProgress, signal: controller.signal });

    const [url, form, config] = post.mock.calls[0] as [string, FormData, AxiosRequestConfig];
    expect(url).toBe("/upload");
    expect((form.get("file") as File).name).toBe("drill.jpg");
    expect(config.params).toEqual({ kind: "equipment" });
    expect(config.signal).toBe(controller.signal);
    config.onUploadProgress?.({ loaded: 50, total: 200 } as AxiosProgressEvent);
    expect(onProgress).toHaveBeenCalledWith(0.25);
  });
});
