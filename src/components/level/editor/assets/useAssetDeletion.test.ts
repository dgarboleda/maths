import { afterEach, describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAssetDeletion } from "./useAssetDeletion";
import type { LevelAsset } from "@/lib/level/assets/assetRepository";

/**
 * docs/asset-management-plan.md §G riesgo R4: antes de borrar, comprobar
 * qué niveles usan la imagen y, si hay alguno, exigir una segunda
 * confirmación explícita. Lógica compartida entre `AssetLibrary` (biblioteca
 * completa) y `BackgroundPicker` (selector embebido en "Nuevo nivel") — se
 * prueba una sola vez acá, aislada de React Testing de cualquiera de los
 * dos componentes.
 */
const deleteAsset = vi.fn(async () => {});
const findLevelsUsingAsset = vi.fn(async () => [] as { id: string; name: string }[]);
vi.mock("@/lib/level/assets/assetRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/level/assets/assetRepository")>();
  return {
    ...actual,
    deleteAsset: () => deleteAsset(),
    findLevelsUsingAsset: () => findLevelsUsingAsset(),
  };
});

vi.mock("./useLevelAssets", () => ({
  getAssetServices: async () => ({ db: {}, firestore: {}, storage: {}, storageFns: {} }),
}));

function mockAsset(overrides: Partial<LevelAsset> = {}): LevelAsset {
  return {
    id: "asset-1",
    label: "Ciudad central",
    alt: "",
    kind: "scene",
    storagePath: "parents/padre-1/level-assets/asset-1.webp",
    url: "https://example.com/asset-1.webp",
    thumbPath: "parents/padre-1/level-assets/asset-1-thumb.webp",
    thumbUrl: "https://example.com/asset-1-thumb.webp",
    width: 1024,
    height: 768,
    originalWidth: 1024,
    originalHeight: 768,
    bytes: 12345,
    contentType: "image/webp",
    hasAlpha: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("useAssetDeletion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("sin niveles asociados, arma la confirmación con usedBy vacío", async () => {
    findLevelsUsingAsset.mockResolvedValueOnce([]);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useAssetDeletion("padre-1", onDeleted));

    await act(async () => {
      await result.current.requestDelete(mockAsset());
    });

    expect(result.current.pendingDelete?.usedBy).toEqual([]);
    expect(result.current.actionError).toBeNull();
  });

  test("con niveles asociados, los incluye en la confirmación por nombre", async () => {
    findLevelsUsingAsset.mockResolvedValueOnce([{ id: "nivel-1", name: "Ciudad Central" }]);
    const { result } = renderHook(() => useAssetDeletion("padre-1", vi.fn()));

    await act(async () => {
      await result.current.requestDelete(mockAsset());
    });

    expect(result.current.pendingDelete?.usedBy).toEqual([{ id: "nivel-1", name: "Ciudad Central" }]);
  });

  test("confirmar borra el asset, avisa onDeleted y cierra la confirmación", async () => {
    findLevelsUsingAsset.mockResolvedValueOnce([]);
    const onDeleted = vi.fn();
    const asset = mockAsset();
    const { result } = renderHook(() => useAssetDeletion("padre-1", onDeleted));

    await act(async () => {
      await result.current.requestDelete(asset);
    });
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(deleteAsset).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledWith(asset.id);
    expect(result.current.pendingDelete).toBeNull();
  });

  test("cancelar no borra nada y cierra la confirmación", async () => {
    findLevelsUsingAsset.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAssetDeletion("padre-1", vi.fn()));

    await act(async () => {
      await result.current.requestDelete(mockAsset());
    });
    act(() => {
      result.current.cancelDelete();
    });

    expect(deleteAsset).not.toHaveBeenCalled();
    expect(result.current.pendingDelete).toBeNull();
  });

  test("si falla la comprobación de niveles asociados, muestra un error y no abre la confirmación", async () => {
    findLevelsUsingAsset.mockRejectedValueOnce(new Error("permission-denied"));
    const { result } = renderHook(() => useAssetDeletion("padre-1", vi.fn()));

    await act(async () => {
      await result.current.requestDelete(mockAsset());
    });

    await waitFor(() => expect(result.current.actionError).toBe("No se pudo comprobar si esta imagen está en uso."));
    expect(result.current.pendingDelete).toBeNull();
  });

  test("si falla el borrado, muestra un error y no avisa onDeleted", async () => {
    findLevelsUsingAsset.mockResolvedValueOnce([]);
    deleteAsset.mockRejectedValueOnce(new Error("network error"));
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useAssetDeletion("padre-1", onDeleted));

    await act(async () => {
      await result.current.requestDelete(mockAsset());
    });
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(result.current.actionError).toBe("No se pudo borrar la imagen.");
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
