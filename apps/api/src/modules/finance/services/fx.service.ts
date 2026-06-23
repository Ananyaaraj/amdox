import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private ratesCache: Record<string, number> = {};
  private lastFetch: Date | null = null;

  constructor(private config: ConfigService) {}

  async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    await this.refreshRatesIfStale();
    const fromRate = this.ratesCache[from] || 1;
    const toRate = this.ratesCache[to] || 1;
    return toRate / fromRate;
  }

  private async refreshRatesIfStale() {
    const now = new Date();
    const isStale =
      !this.lastFetch ||
      now.getTime() - this.lastFetch.getTime() > 1000 * 60 * 60; // 1 hour

    if (!isStale) return;

    try {
      const apiKey = this.config.get("OPENEXCHANGERATES_API_KEY");
      const { data } = await axios.get(
        `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`
      );
      this.ratesCache = data.rates;
      this.lastFetch = now;
      this.logger.log("FX rates refreshed");
    } catch (err) {
      this.logger.warn("Failed to refresh FX rates, using cache");
    }
  }

  getSupportedCurrencies(): string[] {
    return Object.keys(this.ratesCache);
  }
}
