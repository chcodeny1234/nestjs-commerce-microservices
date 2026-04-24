import { Controller, UseInterceptors } from '@nestjs/common';
import { ProductService } from './product.service';
import { GetProductsInfo } from './dto/get-products-info.dto';
import { GrpcInterceptor, ProductMicroservice } from '@app/common';

@Controller('product')
@ProductMicroservice.ProductServiceControllerMethods()
@UseInterceptors(GrpcInterceptor)
export class ProductController
  implements ProductMicroservice.ProductServiceController
{
  constructor(private readonly productService: ProductService) {}

  async createSamples() {
    const resp = await this.productService.createSamples();

    return {
      success: resp,
    };
  }

  async getProductsInfo(request: GetProductsInfo) {
    const resp = await this.productService.getProductsInfo(request.productIds);

    return {
      products: resp,
    };
  }
}
