import { Controller, UseInterceptors } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GrpcInterceptor, NotificationMicroservice } from '@app/common';
import { SendPaymentNotificationDto } from './dto/send-payment-notification.dto';
import { Metadata } from '@grpc/grpc-js';

@Controller()
@NotificationMicroservice.NotificationServiceControllerMethods()
@UseInterceptors(GrpcInterceptor)
export class NotificationController
  implements NotificationMicroservice.NotificationServiceController
{
  constructor(private readonly notificationService: NotificationService) {}

  async sendPaymentNotification(
    request: SendPaymentNotificationDto,
    metadata: Metadata,
  ) {
    const resp = (
      await this.notificationService.sendPaymentNotification(request, metadata)
    ).toJSON();

    return {
      ...resp,
      status: resp.status.toString(),
    };
  }
}
