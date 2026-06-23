import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

export interface OcrResult {
  invoiceNumber?: string;
  vendorName?: string;
  totalAmount?: number;
  taxAmount?: number;
  dueDate?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  confidence: number;
  raw: string;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * F-03: Invoice OCR — 3-way matching (PO / Goods Receipt / Invoice)
   * In production: integrate AWS Textract or Google Document AI.
   * This implementation provides a structured stub with the correct interface.
   */
  async extractInvoiceData(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    this.logger.log(`Running OCR on ${mimeType} document (${fileBuffer.length} bytes)`);

    // Production: call AWS Textract
    // const textract = new TextractClient({ region: process.env.AWS_REGION });
    // const command = new AnalyzeDocumentCommand({ Document: { Bytes: fileBuffer }, FeatureTypes: ["FORMS", "TABLES"] });
    // const response = await textract.send(command);
    // return this.parseTextractResponse(response);

    // Stub: returns mock parsed result for development
    return {
      invoiceNumber: `INV-${Date.now()}`,
      vendorName: "Detected Vendor",
      totalAmount: 0,
      taxAmount: 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      lineItems: [],
      confidence: 0.0,
      raw: "OCR stub — connect AWS Textract or Google Document AI in production",
    };
  }

  /**
   * 3-way matching: PO amount vs GR amount vs Invoice amount
   * Returns true and auto-approves if all 3 match within tolerance
   */
  matchInvoice(
    poTotal: number,
    grTotal: number,
    invoiceTotal: number,
    tolerancePct = 0.02
  ): { matched: boolean; variance: number; autoApprove: boolean } {
    const maxVariance = poTotal * tolerancePct;
    const poVariance = Math.abs(poTotal - invoiceTotal);
    const grVariance = Math.abs(grTotal - invoiceTotal);
    const matched = poVariance <= maxVariance && grVariance <= maxVariance;

    return {
      matched,
      variance: Math.max(poVariance, grVariance),
      autoApprove: matched,
    };
  }
}
