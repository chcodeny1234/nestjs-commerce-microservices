import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { SendPaymentNotificationDto } from './dto/send-payment-notification.dto';
import { Notification, NotificationStatus } from './entity/notification.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientGrpc } from '@nestjs/microservices';
import {
  constructMetadata,
  ORDER_SERVICE,
  OrderMicroservice,
} from '@app/common';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class NotificationService implements OnModuleInit {
  orderService: OrderMicroservice.OrderServiceClient;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @Inject(ORDER_SERVICE)
    private readonly orderMicroservice: ClientGrpc,
  ) {}

  onModuleInit() {
    this.orderService =
      this.orderMicroservice.getService<OrderMicroservice.OrderServiceClient>(
        'OrderService',
      );
  }

  async sendPaymentNotification(
    data: SendPaymentNotificationDto,
    metadata: Metadata,
  ) {
    const notification = await this.createNotification(data.to);

    await this.sendEmail();

    await this.updateNotificationStatus(
      notification._id.toString(),
      NotificationStatus.sent,
    );

    this.sendDeliveryStartedMessage(data.orderId, metadata);

    return this.notificationModel.findById(notification._id);
  }

  sendDeliveryStartedMessage(id: string, metadata: Metadata) {
    this.orderService.deliveryStarted(
      {
        id,
      },
      constructMetadata(
        NotificationService.name,
        'sendDeliveryStartedMessage',
        metadata,
      ),
    );
  }

  async updateNotificationStatus(id: string, status: NotificationStatus) {
    return this.notificationModel.findByIdAndUpdate(id, { status });
  }

  async sendEmail() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async createNotification(to: string) {
    return this.notificationModel.create({
      from: 'noreply@nestjs-commerce-microservices.local',
      to: to,
      subject: 'Delivery has started.',
      content: `Hello ${to}, your order is now on its way.`,
    });
  }
}
