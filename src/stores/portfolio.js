import { defineStore } from "pinia";
import { normalizePortfolio } from "@/domain/normalize";
import sampleApi from "@/mocks/sampleApi.json";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxjQAp6rtSCUTz4T5J96_-zCs9Vrae-7uhZXY7ZIukOZP5fs_HIf44aOAfcN3XfPkis/exec";
const ID_TOKEN_STORAGE_KEY = "asset-google-id-token";

function getGoogleIdToken() {
  return globalThis.localStorage?.getItem(ID_TOKEN_STORAGE_KEY) ?? "";
}

function buildApiUrlWithToken(idToken) {
  if (!idToken) {
    return API_URL;
  }

  const url = new URL(API_URL);
  url.searchParams.set("id_token", idToken);
  return url.toString();
}

export const usePortfolioStore = defineStore("portfolio", {
  state: () => ({
    data: null,
    loading: false,
    error: "",
    source: "",
    rawResponse: null,
  }),
  actions: {
    async fetchPortfolio(directToken = null) {
      if (this.loading) {
        return;
      }
      if (this.error.startsWith("CORS blocked")) {
        return;
      }

      this.loading = true;
      this.error = "";
      const idToken = directToken || getGoogleIdToken();
      try {
        let didRetryMissingIdToken = false;
        while (true) {
          const response = await fetch(buildApiUrlWithToken(idToken));
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const json = await response.json();
          if (json?.status === 401 || json?.status === 403) {
            const authMessage = json.error ?? "unauthorized";
            if (
              authMessage === "missing id token"
              && idToken
              && !didRetryMissingIdToken
            ) {
              didRetryMissingIdToken = true;
              continue;
            }

            if (authMessage === "missing id token") {
              throw new Error("AUTH 401: missing id token (GAS must read e.parameter.id_token)");
            }

            throw new Error(`AUTH ${json.status}: ${authMessage}`);
          }

          this.rawResponse = json;
          const payload = json?.data ?? json;
          this.data = normalizePortfolio(payload);
          this.source = "live";
          break;
        }
      } catch (error) {
        const message = error?.message ?? "unknown error";
        if (message.startsWith("AUTH ")) {
          this.error = message;
          this.data = null;
          this.source = "";
          this.rawResponse = null;
          return;
        }

        const isCorsError = message.toLowerCase().includes("failed to fetch");
        if (idToken && isCorsError) {
          this.error = "CORS blocked API request. Ensure GAS doGet returns Access-Control-Allow-Origin.";
          this.data = null;
          this.source = "";
          this.rawResponse = null;
          return;
        }

        this.error = `${message} (fallback to mock)`;
        this.rawResponse = sampleApi;
        this.data = normalizePortfolio(sampleApi);
        this.source = "mock";
      } finally {
        this.loading = false;
      }
    },
  },
});
