import json

# Read products.json
with open('d:/PBL6/PBL6/src/data-init/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Distribute products across 4 shops (5 products each)
# Shop 1: products 0-4
# Shop 2: products 5-9
# Shop 3: products 10-14
# Shop 4: products 15-19

for i, product in enumerate(products):
    if i < 5:
        product['shop_id'] = 1
    elif i < 10:
        product['shop_id'] = 2
    elif i < 15:
        product['shop_id'] = 3
    else:
        product['shop_id'] = 4

# Write back to products.json
with open('d:/PBL6/PBL6/src/data-init/products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print(f"✅ Updated {len(products)} products")
print("Distribution:")
for shop_id in range(1, 5):
    count = sum(1 for p in products if p['shop_id'] == shop_id)
    print(f"  Shop {shop_id}: {count} products")
