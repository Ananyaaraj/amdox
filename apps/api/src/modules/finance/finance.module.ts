import { Module } from "@nestjs/common";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { LedgerService } from "./services/ledger.service";
import { InvoiceService } from "./services/invoice.service";
import { PaymentService } from "./services/payment.service";
import { FxService } from "./services/fx.service";
import { OcrService } from "./services/ocr.service";

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, LedgerService, InvoiceService, PaymentService, FxService, OcrService],
  exports: [FinanceService, FxService, OcrService],
})
export class FinanceModule {}
