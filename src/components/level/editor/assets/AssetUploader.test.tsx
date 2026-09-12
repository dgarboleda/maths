import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetUploader } from "./AssetUploader";

/**
 * Cubre solo el bloque explicativo agregado a pedido del usuario ("qué tipo
 * de imagen se debe subir en cada opción, tamaño, cuál sería el resultado
 * final") — nada de esto toca Firebase, así que no hace falta mockear
 * `getAssetServices`/`uploadAsset` para este test.
 */
describe("AssetUploader — ayuda por tipo de imagen", () => {
  test("muestra la descripción y el tamaño recomendado del tipo elegido por defecto", () => {
    render(<AssetUploader parentId="padre-1" defaultKind="scene" existingAssets={[]} onUploaded={() => {}} />);

    expect(screen.getByText(/Llena toda la pantalla del nivel/)).toBeInTheDocument();
    expect(screen.getByText(/Panorámica/)).toBeInTheDocument();
  });

  test("cambia la descripción al elegir otro tipo", async () => {
    const user = userEvent.setup();
    render(<AssetUploader parentId="padre-1" defaultKind="scene" existingAssets={[]} onUploaded={() => {}} />);

    await user.click(screen.getByRole("radio", { name: "Avatar de personaje" }));

    expect(screen.getByText(/Se recorta en redondo/)).toBeInTheDocument();
    expect(screen.getByText(/Cuadrada/)).toBeInTheDocument();
    expect(screen.queryByText(/Llena toda la pantalla del nivel/)).not.toBeInTheDocument();
  });
});
