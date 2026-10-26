import { vi } from "vitest";

vi.mock("next/link", () => ({ default: "a" }));

export const routerMocks = {
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));
