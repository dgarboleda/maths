import { useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { axe } from "jest-axe";
import { ChildPinEntry } from "./ChildPinEntry";

function Entry({ confirm, disabled = false }: { confirm: () => void; disabled?: boolean }) {
  const [pin, setPin] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  return <ChildPinEntry id="pin-ada" childName="Ada" pin={pin} onChange={setPin}
    onConfirm={() => confirm()} disabled={disabled} error={null} shakes={0} entryRef={ref} />;
}

test("usa un solo teclado en pantalla y oculta el PIN sin campos de contraseña", async () => {
  const user = userEvent.setup();
  const view = render(<Entry confirm={vi.fn()} />);
  const keypad = screen.getByRole("group", { name: "Teclado numérico para Ada" });
  for (const digit of ["0", "1", "2", "3", "4"])
    await user.click(screen.getByRole("button", { name: digit }));
  expect(screen.getByRole("status")).toHaveTextContent("4 de 4 dígitos");
  expect(screen.getByRole("textbox", { name: "PIN de Ada" })).not.toHaveTextContent("0123");
  expect(view.container.querySelector("input, textarea, [contenteditable], form")).toBeNull();
  expect(keypad).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Borrar último dígito" }));
  expect(screen.getByRole("status")).toHaveTextContent("3 de 4 dígitos");
  expect(await axe(view.container)).toHaveNoViolations();
});

test("permite teclado físico, borrar y confirmar únicamente cuatro dígitos", async () => {
  const user = userEvent.setup();
  const confirm = vi.fn();
  render(<Entry confirm={confirm} />);
  await user.click(screen.getByRole("textbox", { name: "PIN de Ada" }));
  await user.keyboard("a12{Enter}");
  expect(confirm).not.toHaveBeenCalled();
  await user.keyboard("3{Backspace}45");
  expect(screen.getByRole("status")).toHaveTextContent("4 de 4 dígitos");
  await user.keyboard("6{Enter}");
  expect(confirm).toHaveBeenCalledOnce();
  await user.keyboard("{Delete}");
  expect(screen.getByRole("status")).toHaveTextContent("3 de 4 dígitos");
});

test("no modifica ni reenvía el PIN durante la comprobación", async () => {
  const user = userEvent.setup();
  const confirm = vi.fn();
  render(<Entry confirm={confirm} disabled />);
  await user.click(screen.getByRole("button", { name: "1" }));
  await user.click(screen.getByRole("textbox", { name: "PIN de Ada" }));
  await user.keyboard("1234{Enter}");
  expect(screen.getByRole("status")).toHaveTextContent("0 de 4 dígitos");
  expect(confirm).not.toHaveBeenCalled();
});
