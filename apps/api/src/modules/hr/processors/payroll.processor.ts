import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PayrollService } from "../services/payroll.service";

@Processor("payroll")
export class PayrollProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(private payrollService: PayrollService) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing payroll job ${job.id}: ${job.name}`);

    switch (job.name) {
      case "process-payroll":
        await this.payrollService.processPayrollRun(
          job.data.payrollRunId,
          job.data.tenantId
        );
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }
}
