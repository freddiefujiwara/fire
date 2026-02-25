import { runFullMonteCarloAnalysis } from "../../domain/fire/engine";

self.onmessage = (e) => {
  const { simulationParams, options } = e.data;
  try {
    const result = runFullMonteCarloAnalysis(simulationParams, options);
    self.postMessage({ type: "success", result });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
