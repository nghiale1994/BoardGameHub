import { act, render, type RenderOptions } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import type { ReactElement, ReactNode } from "react";
import i18n from "../i18n";

type ProvidersOptions = {
  language?: "en" | "vi";
};

const Providers = ({ children }: { children: ReactNode }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export const renderWithI18n = async (
  ui: ReactElement,
  options: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {}
) => {
  const language = options.language ?? "en";
  localStorage.setItem("boardgamehub.language", language);
  await i18n.changeLanguage(language);
  const { language: _ignored, ...rest } = options;
  const result = render(ui, { wrapper: Providers, ...rest });
  await act(async () => {
    await Promise.resolve();
  });
  return result;
};
