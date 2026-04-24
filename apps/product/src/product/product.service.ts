import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entity/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getProductsInfo(productIds: string[]) {
    const products = await this.productRepository.find({
      where: {
        id: In(productIds),
      },
    });

    return products;
  }

  async createSamples() {
    const data = [
      {
        name: 'Apple',
        price: 1000,
        description: 'Sweet Cheongju apple.',
        stock: 2,
      },
      {
        name: 'Melon',
        price: 2000,
        description: 'Fresh muskmelon.',
        stock: 1,
      },
      {
        name: 'Watermelon',
        price: 3000,
        description: 'Seedless watermelon.',
        stock: 10,
      },
      {
        name: 'Broccoli',
        price: 2000,
        description: 'Farm fresh broccoli.',
        stock: 0,
      },
      {
        name: 'Banana',
        price: 1500,
        description: 'Ripe yellow banana.',
        stock: 3,
      },
    ];

    await this.productRepository.save(data);

    return true;
  }
}
