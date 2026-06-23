import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@elastic/elasticsearch";

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Client;

  constructor(private config: ConfigService) {
    this.client = new Client({
      node: config.get("ELASTICSEARCH_URL", "http://localhost:9200"),
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log("Elasticsearch connected");
      await this.ensureIndices();
    } catch {
      this.logger.warn("Elasticsearch not available — search features degraded");
    }
  }

  private async ensureIndices() {
    const indices = [
      {
        index: "vendors",
        mappings: {
          properties: {
            name: { type: "text", analyzer: "standard" },
            code: { type: "keyword" },
            email: { type: "keyword" },
            tenantId: { type: "keyword" },
          },
        },
      },
      {
        index: "products",
        mappings: {
          properties: {
            name: { type: "text", analyzer: "standard" },
            sku: { type: "keyword" },
            category: { type: "keyword" },
            tenantId: { type: "keyword" },
          },
        },
      },
      {
        index: "employees",
        mappings: {
          properties: {
            name: { type: "text", analyzer: "standard" },
            email: { type: "keyword" },
            jobTitle: { type: "text" },
            tenantId: { type: "keyword" },
          },
        },
      },
    ];

    for (const { index, mappings } of indices) {
      const exists = await this.client.indices.exists({ index });
      if (!exists) {
        await this.client.indices.create({ index, mappings } as any);
        this.logger.log(`Created index: ${index}`);
      }
    }
  }

  async index(index: string, id: string, document: Record<string, any>) {
    try {
      await this.client.index({ index, id, document });
    } catch (err) {
      this.logger.warn(`Failed to index ${index}/${id}: ${err}`);
    }
  }

  async search(tenantId: string, query: string, indices: string[] = ["vendors", "products", "employees"]) {
    try {
      const result = await this.client.search({
        index: indices.join(","),
        query: {
          bool: {
            must: [
              { multi_match: { query, fields: ["name^3", "email", "sku", "code", "jobTitle"], fuzziness: "AUTO" } },
            ],
            filter: [{ term: { tenantId } }],
          },
        },
        size: 20,
      });

      return result.hits.hits.map((hit: any) => ({
        id: hit._id,
        index: hit._index,
        score: hit._score,
        ...hit._source,
      }));
    } catch {
      return [];
    }
  }

  async delete(index: string, id: string) {
    try {
      await this.client.delete({ index, id });
    } catch {}
  }
}
