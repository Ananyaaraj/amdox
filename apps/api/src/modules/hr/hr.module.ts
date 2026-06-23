import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { HrController } from "./hr.controller";
import { HrService } from "./hr.service";
import { PayrollService } from "./services/payroll.service";
import { PayslipService } from "./services/payslip.service";
import { PayrollProcessor } from "./processors/payroll.processor";

@Module({
  imports: [BullModule.registerQueue({ name: "payroll" })],
  controllers: [HrController],
  providers: [HrService, PayrollService, PayslipService, PayrollProcessor],
  exports: [HrService],
})
export class HrModule {}
