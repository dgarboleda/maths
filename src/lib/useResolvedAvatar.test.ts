import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useResolvedAvatar } from "./useResolvedAvatar";

const mocks = vi.hoisted(() => ({ profile: { avatarId: "maths-saludo" }, world: vi.fn(), levels: vi.fn() }));
vi.mock("./firebase", () => ({ getFirebase: async () => ({ db: {}, firestore: { doc: vi.fn(), getDoc: async () => ({ exists: () => true, data: () => mocks.profile }) } }) }));
vi.mock("./useTotalStars", () => ({ useTotalStars: () => 0 }));
vi.mock("./gameworld/persistence/worldRepository", () => ({ getWorld: mocks.world }));
vi.mock("./level/persistence/levelRepository", () => ({ listLevels: mocks.levels, getLevel: vi.fn() }));
beforeEach(() => { mocks.profile.avatarId = "maths-saludo"; mocks.world.mockResolvedValue(null); mocks.levels.mockResolvedValue([]); });

test("el avatar incluido se resuelve aunque no haya un catálogo personalizado", async () => {
  const { result } = renderHook(() => useResolvedAvatar("familia", "hijo", {}));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.avatar).toMatchObject({ id: "maths-saludo", headshotSrc: "/avatars/saludo.jpg", bodySrc: "/illustrations/explorer.webp" });
});

test("un avatar antiguo inexistente conserva la resolución predeterminada", async () => {
  mocks.profile.avatarId = "avatar-borrado";
  const { result } = renderHook(() => useResolvedAvatar("familia", "hijo", {}));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.avatar).toBeNull();
});
