import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  constructMetadata,
  PAYMENT_SERVICE,
  PaymentMicroservice,
  PRODUCT_SERVICE,
  ProductMicroservice,
  USER_SERVICE,
  UserMicroservice,
} from '@app/common';
import { PaymentCancelledExcpetion } from './exception/payment-cancelled.exception';
import { Product } from './entity/product.entity';
import { Customer } from './entity/customer.entity';
import { AddressDto } from './dto/address.dto';
import { Model } from 'mongoose';
import { Order, OrderStatus } from './entity/order.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaymentDto } from './dto/payment.dto';
import { PaymentFailedException } from './exception/payment-failed.exception';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class OrderService implements OnModuleInit {
  userService: UserMicroservice.UserServiceClient;
  productService: ProductMicroservice.ProductServiceClient;
  paymentService: PaymentMicroservice.PaymentServiceClient;

  constructor(
    @Inject(USER_SERVICE)
    private readonly userMicroservice: ClientGrpc,
    @Inject(PRODUCT_SERVICE)
    private readonly productMicroservice: ClientGrpc,
    @Inject(PAYMENT_SERVICE)
    private readonly paymentMicroservice: ClientGrpc,
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
  ) {}
  onModuleInit() {
    this.userService =
      this.userMicroservice.getService<UserMicroservice.UserServiceClient>(
        'UserService',
      );

    this.productService =
      this.productMicroservice.getService<ProductMicroservice.ProductServiceClient>(
        'ProductService',
      );

    this.paymentService =
      this.paymentMicroservice.getService<PaymentMicroservice.PaymentServiceClient>(
        'PaymentService',
      );
  }

  async createOrder(createOrderDto: CreateOrderDto, metadata: Metadata) {
    const { productIds, address, payment, meta } = createOrderDto;

    // Build the order from upstream service data before attempting payment.
    const user = await this.getUserFromToken(meta.user.sub, metadata);

    const products = await this.getProductsByIds(productIds, metadata);

    const totalAmount = this.calculateTotalAmount(products);

    this.validatePaymentAmount(totalAmount, payment.amount);

    const customer = this.createCustomer(user);
    const order = await this.createNewOrder(
      customer,
      products,
      address,
      payment,
    );

    await this.processPayment(
      order._id.toString(),
      payment,
      user.email,
      metadata,
    );

    return this.orderModel.findById(order._id);
  }

  private async getUserFromToken(userId: string, metadata: Metadata) {
    const uResp = await lastValueFrom(
      this.userService.getUserInfo(
        { userId },
        constructMetadata(OrderService.name, 'getUserFromToken', metadata),
      ),
    );

    return uResp;
  }

  private async getProductsByIds(
    productIds: string[],
    metadata: Metadata,
  ): Promise<Product[]> {
    const resp = await lastValueFrom(
      this.productService.getProductsInfo(
        {
          productIds,
        },
        constructMetadata(OrderService.name, 'getProductsByIds', metadata),
      ),
    );

    return resp.products.map((product) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
    }));
  }

  private calculateTotalAmount(product: Product[]) {
    return product.reduce((acc, next) => acc + next.price, 0);
  }

  private validatePaymentAmount(totalA: number, totalB: number) {
    if (totalA !== totalB) {
      throw new PaymentCancelledExcpetion(
        'The payment amount no longer matches the current order total.',
      );
    }
  }

  private createCustomer(user: { id: string; email: string; name: string }) {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private createNewOrder(
    customer: Customer,
    products: Product[],
    deliveryAddress: AddressDto,
    payment: PaymentDto,
  ) {
    return this.orderModel.create({
      customer,
      products,
      deliveryAddress,
      payment,
    });
  }

  async processPayment(
    orderId: string,
    payment: PaymentDto,
    userEmail: string,
    metadata: Metadata,
  ) {
    try {
      // Treat the payment service as the source of truth for the final order state.
      const resp = await lastValueFrom(
        this.paymentService.makePayment(
          {
            ...payment,
            userEmail,
            orderId,
          },
          constructMetadata(OrderService.name, 'processPayment', metadata),
        ),
      );

      const isPaid = resp.paymentStatus === 'Approved';
      const orderStatus = isPaid
        ? OrderStatus.paymentProcessed
        : OrderStatus.paymentFailed;

      if (orderStatus === OrderStatus.paymentFailed) {
        throw new PaymentFailedException(resp);
      }

      await this.orderModel.findByIdAndUpdate(orderId, {
        status: OrderStatus.paymentProcessed,
      });

      return resp;
    } catch (e) {
      // Only mark the order as failed when the downstream payment result was explicit.
      if (e instanceof PaymentFailedException) {
        await this.orderModel.findByIdAndUpdate(orderId, {
          status: OrderStatus.paymentFailed,
        });
      }

      throw e;
    }
  }

  changeOrderStatus(orderId: string, status: OrderStatus) {
    return this.orderModel.findByIdAndUpdate(orderId, { status });
  }
}
