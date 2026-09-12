import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetUploader } from "./AssetUploader";
import type { PreparedAssetUpload } from "@/lib/level/assets/imageRules";

/**
 * Asistente de 3 pasos (Tipo → Archivo → Confirmar) — a pedido del usuario
 * ("sería aún mejor un asistente que guíe... si hubiesen imágenes de cómo
 * quedaría sería ideal"). `prepareUpload`/`uploadAsset` decodifican con
 * Canvas real (no disponible en jsdom), así que se mockean; el resto del
 * flujo (navegación entre pasos, vista previa en vivo, avisos) se ejerce tal
 * cual.
 */
const prepareUpload = vi.fn<(file: File, kind: string) => Promise<PreparedAssetUpload>>();
vi.mock("@/lib/level/assets/imageProcessing", () => ({
  prepareUpload: (file: File, kind: string) => prepareUpload(file, kind),
}));

const uploadAsset = vi.fn();
vi.mock("@/lib/level/assets/assetRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/level/assets/assetRepository")>();
  return { ...actual, uploadAsset: (...args: unknown[]) => uploadAsset(...args) };
});

vi.mock("./useLevelAssets", () => ({
  getAssetServices: async () => ({ db: {}, firestore: {}, storage: {}, storageFns: {} }),
}));

function mockPrepared(overrides: Partial<PreparedAssetUpload> = {}): PreparedAssetUpload {
  return {
    kind: "scene",
    blob: new Blob(["x"]),
    thumbBlob: new Blob(["x"]),
    contentType: "image/webp",
    width: 1600,
    height: 900,
    originalWidth: 1600,
    originalHeight: 900,
    bytes: 1000,
    hasAlpha: false,
    ...overrides,
  };
}

function pngFile(name = "fondo.png") {
  return new File(["x"], name, { type: "image/png" });
}

describe("AssetUploader — asistente de 3 pasos", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-preview");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("paso 1 muestra los 3 tipos con su descripción y tamaño recomendado", () => {
    render(<AssetUploader parentId="padre-1" defaultKind="scene" existingAssets={[]} onUploaded={vi.fn()} />);

    expect(screen.getByText("Paso 1 de 3 · Tipo")).toBeInTheDocument();
    expect(screen.getByText(/Llena toda la pantalla del nivel/)).toBeInTheDocument();
    expect(screen.getByText(/Se recorta en redondo/)).toBeInTheDocument();
  });

  test("elegir un tipo avanza al paso 2 con el recordatorio de forma/tamaño de ESE tipo", async () => {
    const user = userEvent.setup();
    render(<AssetUploader parentId="padre-1" defaultKind="scene" existingAssets={[]} onUploaded={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Avatar de personaje/ }));

    expect(screen.getByText("Paso 2 de 3 · Archivo")).toBeInTheDocument();
    expect(screen.getByText(/Cuadrada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Cambiar tipo" })).toBeInTheDocument();
  });

  test("elegir un archivo válido avanza al paso 3 con la vista previa en vivo", async () => {
    prepareUpload.mockResolvedValueOnce(mockPrepared());
    const user = userEvent.setup();
    render(<AssetUploader parentId="padre-1" defaultKind="scene" existingAssets={[]} onUploaded={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Fondo de escena completa/ }));
    await user.upload(screen.getByLabelText("Archivo (WebP, PNG o JPEG)"), pngFile());

    await waitFor(() => expect(screen.getByText("Paso 3 de 3 · Confirmar")).toBeInTheDocument());
    expect(screen.getByText("Así se va a ver:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Cambiar imagen" })).toBeInTheDocument();
  });

  test("avisa si la imagen de avatar es opaca (sin transparencia)", async () => {
    prepareUpload.mockResolvedValueOnce(mockPrepared({ kind: "avatar", hasAlpha: false, width: 512, height: 512, originalWidth: 512, originalHeight: 512 }));
    const user = userEvent.setup();
    render(<AssetUploader parentId="padre-1" defaultKind="scene" existingAssets={[]} onUploaded={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Avatar de personaje/ }));
    await user.upload(screen.getByLabelText("Archivo (WebP, PNG o JPEG)"), pngFile("avatar.png"));

    await waitFor(() => expect(screen.getByText(/se va a ver con un fondo rectangular/)).toBeInTheDocument());
  });

  test("confirmar en el paso 3 sube la imagen y avisa onUploaded", async () => {
    prepareUpload.mockResolvedValueOnce(mockPrepared());
    uploadAsset.mockResolvedValueOnce({ id: "asset-1" });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<AssetUploader parentId="padre-1" defaultKind="scene" existingAssets={[]} onUploaded={onUploaded} />);

    await user.click(screen.getByRole("button", { name: /Fondo de escena completa/ }));
    await user.upload(screen.getByLabelText("Archivo (WebP, PNG o JPEG)"), pngFile());
    await waitFor(() => expect(screen.getByText("Paso 3 de 3 · Confirmar")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Descripción (para lectores de pantalla)"), "una plaza soleada");
    await user.click(screen.getByRole("button", { name: /^Subir$/ }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ id: "asset-1" }));
    expect(uploadAsset).toHaveBeenCalledTimes(1);
  });
});
