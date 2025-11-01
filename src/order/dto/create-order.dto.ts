export class CreateOrderDto {
  shipping_address_id: number;
  note?: string;
  payment_method?: string; // 'cod' | 'online'
}

export class QueryOrdersDto {
  page?: number;
  limit?: number;
  status?: string;
}

