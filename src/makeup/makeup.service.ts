// src/makeup/makeup.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MakeupService {
  constructor(private readonly prisma: PrismaService) {}

  // Dữ liệu màu sắc cho từng skintone
  private skintoneColors = {
    fair: {
      lips: { color: '#E8747C', alpha: 0.6, name: 'Hồng đào nhẹ' },
      eyeshadow: { color: '#D4A5A5', alpha: 0.3, name: 'Hồng pastel' },
      blush: { color: '#FFB6C1', alpha: 0.25, name: 'Hồng baby' },
      eyeliner: { color: '#4A3728', alpha: 0.85, name: 'Nâu sô-cô-la' },
      eyebrows: { color: '#6B4423', alpha: 0.5, name: 'Nâu tự nhiên' },
      foundation: { color: '#FFE4C4', alpha: 0.28, name: 'Tông nền sáng be' },
      mascara: { color: '#2C1B10', alpha: 0.9, name: 'Nâu đen tự nhiên' },
    },
    light: {
      lips: { color: '#C54B6C', alpha: 0.65, name: 'Hồng berry' },
      eyeshadow: { color: '#9D7B6A', alpha: 0.32, name: 'Nâu ấm' },
      blush: { color: '#E8A4A4', alpha: 0.28, name: 'Hồng san hô' },
      eyeliner: { color: '#3D2B1F', alpha: 0.88, name: 'Nâu đậm' },
      eyebrows: { color: '#5C4033', alpha: 0.52, name: 'Nâu trung' },
      foundation: { color: '#F5DEB3', alpha: 0.3, name: 'Tông nền be sáng' },
      mascara: { color: '#1C1008', alpha: 0.92, name: 'Đen nâu' },
    },
    medium: {
      lips: { color: '#B5495B', alpha: 0.68, name: 'Hồng đất' },
      eyeshadow: { color: '#8B6B61', alpha: 0.35, name: 'Nâu đồng' },
      blush: { color: '#D4836A', alpha: 0.3, name: 'Cam đất' },
      eyeliner: { color: '#2C1810', alpha: 0.9, name: 'Espresso' },
      eyebrows: { color: '#4A3728', alpha: 0.55, name: 'Nâu cà phê' },
      foundation: { color: '#DEB887', alpha: 0.32, name: 'Tông nền trung' },
      mascara: { color: '#0D0D0D', alpha: 0.94, name: 'Đen tuyền mềm' },
    },
    tan: {
      lips: { color: '#8B3A3A', alpha: 0.7, name: 'Đỏ gạch' },
      eyeshadow: { color: '#A0522D', alpha: 0.38, name: 'Cam cháy' },
      blush: { color: '#CD853F', alpha: 0.32, name: 'Đồng ánh kim' },
      eyeliner: { color: '#1C1008', alpha: 0.92, name: 'Đen nâu' },
      eyebrows: { color: '#3D2914', alpha: 0.58, name: 'Nâu sậm' },
      foundation: { color: '#D2A679', alpha: 0.34, name: 'Tông nền ngăm' },
      mascara: { color: '#000000', alpha: 0.96, name: 'Đen đậm' },
    },
    dark: {
      lips: { color: '#722F37', alpha: 0.72, name: 'Rượu vang' },
      eyeshadow: { color: '#8B4513', alpha: 0.4, name: 'Nâu đỏ' },
      blush: { color: '#B8593B', alpha: 0.35, name: 'Terracotta' },
      eyeliner: { color: '#0D0D0D', alpha: 0.95, name: 'Đen tuyền' },
      eyebrows: { color: '#2D1F14', alpha: 0.6, name: 'Nâu đen' },
      foundation: { color: '#8B6914', alpha: 0.36, name: 'Tông nền nâu' },
      mascara: { color: '#000000', alpha: 0.97, name: 'Đen sâu' },
    },
    deep: {
      lips: { color: '#5C2A2A', alpha: 0.75, name: 'Mận chín' },
      eyeshadow: { color: '#6B4423', alpha: 0.42, name: 'Đồng đậm' },
      blush: { color: '#8B4513', alpha: 0.38, name: 'Nâu ánh đỏ' },
      eyeliner: { color: '#000000', alpha: 0.95, name: 'Jet black' },
      eyebrows: { color: '#1A1209', alpha: 0.62, name: 'Đen tự nhiên' },
      foundation: { color: '#5C4033', alpha: 0.38, name: 'Tông nền nâu đậm' },
      mascara: { color: '#000000', alpha: 0.98, name: 'Đen tuyền' },
    },
  };

  // Map category names
  private categoryMap = {
    lips: ['Son thỏi', 'Son kem', 'Son tint', 'Son dưỡng có màu','Soi môi'],
    eyeshadow: ['Phấn mắt'],
    blush: ['Phấn má hồng'],
    eyeliner: ['Kẻ mắt'],
    eyebrows: ['Chì kẻ mày'],
    foundation: ['Kem nền'],
    mascara: ['Mascara'],
  };

  // Hàm chuyển hex sang RGB
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Hàm tính khoảng cách màu
  private colorDistance(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    if (!rgb1 || !rgb2) return Infinity;
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  }

  /**
   * Gợi ý danh sách sản phẩm phù hợp với skintone
   */
  async recommendProductsBySkintone(skintone: string) {
    const skinKey = skintone.toLowerCase() as keyof typeof this.skintoneColors;
    if (!this.skintoneColors[skinKey]) {
      // Nếu không có, trả về products mặc định
      return this.prisma.products.findMany({
        where: {
          is_published: true,
          moderation_status: 'approved',
        },
        include: {
          brand: true,
          product_categories: { include: { category: true } },
          product_media: true,
          product_variants: true,
        },
        take: 20,
        orderBy: { avg_rating: 'desc' },
      });
    }

    const skinColors = this.skintoneColors[skinKey];

    // Lấy tất cả categories makeup
    const allCategories = Object.values(this.categoryMap).flat();

    // Query products với categories makeup và variants có shade_hex
    const products = await this.prisma.products.findMany({
      where: {
        is_published: true,
        moderation_status: 'approved',
        product_categories: {
          some: {
            category: {
              name: { in: allCategories },
            },
          },
        },
        product_variants: {
          some: {
            shade_hex: { not: null },
          },
        },
      },
      include: {
        brand: true,
        product_categories: { include: { category: true } },
        product_media: true,
        product_variants: true,
      },
    });

    // Với mỗi loại trong categoryMap, chọn 1 product có màu gần nhất
    const results: any[] = [];

    for (const [productType, cats] of Object.entries(this.categoryMap) as Array<[keyof typeof this.categoryMap, string[]]>) {
      if (!skinColors[productType as keyof typeof skinColors]) continue;

      let bestProduct: any = null;
      let bestDistance = Infinity;

      for (const product of products) {
        // kiểm tra product có thuộc category của productType không
        const belongs = product.product_categories.some(pc => cats.includes(pc.category.name));
        if (!belongs) continue;

        // tìm variant có distance nhỏ nhất cho product này
        let productMinDistance = Infinity;
        let variantHex: string | null = null;
        let variantId: number | null = null;

        for (const variant of product.product_variants) {
          if (!variant.shade_hex) continue;
          const distance = this.colorDistance(variant.shade_hex, skinColors[productType as keyof typeof skinColors].color);
          if (distance < productMinDistance) {
            productMinDistance = distance;
            variantHex = variant.shade_hex;
            variantId = variant.id ?? null;
          }
        }

        if (productMinDistance < bestDistance) {
          bestDistance = productMinDistance;
          bestProduct = {
            product_id: product.id,
            product_name: product.name,
            variant_id: variantId,
            shade_hex: variantHex,
            colorDistance: productMinDistance,
            bestMatch: `${productType}: ${skinColors[productType as keyof typeof skinColors].name}`,
          };
        }
      }

      if (bestProduct) results.push(bestProduct);
    }

    // Sắp xếp theo loại (giữ thứ tự productType từ categoryMap) và khoảng cách
    return results;
  }

  /**
   * Trả về danh sách sản phẩm nhóm theo các mục makeup (lips, eyeshadow, ...)
   * @param limitPerCategory số lượng sản phẩm tối đa mỗi mục
   */
  async getProductsByCategories(limitPerCategory = 10) {
    const result: Record<string, any[]> = {};

    for (const [productType, cats] of Object.entries(this.categoryMap) as Array<[keyof typeof this.categoryMap, string[]]>) {
      const products = await this.prisma.products.findMany({
        where: {
          is_published: true,
          moderation_status: 'approved',
          product_categories: {
            some: {
              category: { name: { in: cats } },
            },
          },
        },
        include: {
          brand: true,
          product_categories: { include: { category: true } },
          product_media: true,
          product_variants: true,
        },
        take: limitPerCategory,
        orderBy: { avg_rating: 'desc' },
      });

      result[productType] = products;
    }

    return result;
  }
}
