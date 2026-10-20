import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { axe } from "jest-axe";
import { ProfileAvatarSelector } from "./ProfileAvatarSelector";
import { Avatar } from "@/components/world/Avatar";

function Form() {
  const [value, setValue] = useState("maths-animo");
  return <main><ProfileAvatarSelector value={value} onChange={setValue} /></main>;
}

test("elige uno de los tres personajes con teclado y conserva una sola selección accesible", async () => {
  const user = userEvent.setup();
  const view = render(<Form />);
  expect(screen.getByRole("radio", { name: "Ánimo" })).toBeChecked();
  await user.tab();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("radio", { name: "Sonrisa" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Ánimo" })).not.toBeChecked();
  await user.click(screen.getByRole("radio", { name: "Saludo" }));
  expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
  expect(screen.getByRole("radio", { name: "Saludo" })).toBeChecked();
  expect(await axe(view.container)).toHaveNoViolations();
});

test("no cambia de avatar durante el guardado", async () => {
  const choose = vi.fn();
  render(<ProfileAvatarSelector value="maths-animo" onChange={choose} disabled />);
  await userEvent.click(screen.getByRole("radio", { name: "Saludo" }));
  expect(choose).not.toHaveBeenCalled();
  expect(screen.getByRole("radio", { name: "Ánimo" })).toBeChecked();
});

test("el retrato usa el personaje elegido y los perfiles sin avatar mantienen el predeterminado", () => {
  const view = render(<Avatar avatarId="maths-saludo" title="Noa" className="size-16" />);
  expect(screen.getByRole("img", { name: "Noa" })).toHaveAttribute("src", "/avatars/saludo.jpg");
  view.rerender(<Avatar avatarId="https://sitio-ajeno.test/foto.jpg" title="Noa" />);
  expect(screen.getByRole("img", { name: "Noa" })).toHaveAttribute("src", "/illustrations/avatar.webp");
  view.rerender(<Avatar variant="explorer" avatarId="maths-saludo" title="Noa" />);
  expect(screen.getByRole("img", { name: "Noa" })).toHaveAttribute("src", "/illustrations/explorer.webp");
});
